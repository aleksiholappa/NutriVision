import ollama
import os
import json
import pandas
import requests
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
from bson import Binary
import base64
import filetype
from datetime import datetime, timezone

import logging

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


app = Flask(__name__)
CORS(app)

# Set up MongoDB: user URI to connect, create new collection
mongo_uri = os.environ.get("MONGODB_URI")
client = MongoClient(mongo_uri)
db = client["NutriVision"]
chat_collection = db["chat_history"]

# Make sure chats are deleted after 30 days
# chat_collection.create_index("createdAt", expireAfterSeconds=60*60*24*30)

food_data = pandas.read_csv("foodname_EN.csv", encoding="ISO-8859-1", delimiter=";")

def get_food_id(food_name):
    # Try to find the best match for a food in Fineli database.
    # Check for an exact match in the database.
    exact_match = food_data[food_data["FOODNAME"] == food_name]
    if not exact_match.empty:
        return exact_match.iloc[0]["FOODID"]

    # Check for a match that starts with food name in database.
    startswith_match = food_data[food_data["FOODNAME"].str.startswith(food_name)]
    if not startswith_match.empty:
        return startswith_match.iloc[0]["FOODID"]

    # Check for a match that contains food name in database.
    contains_match = food_data[food_data["FOODNAME"].str.contains(food_name)]
    if not contains_match.empty:
        return contains_match.iloc[0]["FOODID"]

    return "Food ID not found in database."


def get_nutritional_values(food_name):
    # Get food ID and fetch data from Fineli API.
    food_id = get_food_id(food_name)
    if not food_id:
        return f"Food '{food_name}' not found in database."

    else:
        url = f"https://fineli.fi/fineli/api/v1/foods/{food_id}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            data = response.json()
            # Get the data from Fineli API and sort it out.
            return {
                "Calories": data.get("energyKcal", "N/A"),
                "Protein": data.get("protein", "N/A"),
                "Fat": data.get("fat", "N/A"),
                "Carbohydrates": data.get("carbohydrate", "N/A"),
                "Fiber": data.get("fiber", "N/A"),
            }
        else:
            return f"Error fetching data for {food_name}."


def sort_foods_input(user_input):
    # Give prompt for the model to sort out foods from the user input.
    prompt = f"""
    Extract a list of distinct food items mentioned in the text below.
    Return ONLY a comma-separated list of the food items.
    Example: If input is "I ate apple, banana and apple", return "apple, banana".
    If no food items are mentioned, return an empty string.
    Do not include explanations, apologies, or the word "NONE".

    Text: "{user_input}"
    """
    response = ollama.chat(
        model="llama3.1", messages=[{"role": "user", "content": prompt}]
    )
    sorted_foods = response.get("message", []).get("content","").strip()

    potential_foods_comma_split = sorted_foods.split(',')
    processed_foods = set()
    food_list = []

    for item in potential_foods_comma_split:
        cleaned_item = item.strip()

        if '\n' in cleaned_item:
            cleaned_item = cleaned_item.split('\n')[0].strip()

        if cleaned_item and cleaned_item.upper() != 'NONE':
            processed_foods.add(cleaned_item)
    
    food_list = list(processed_foods)
    return food_list


@app.route("/chat", methods=["POST"])
def chat_handler():
    data = request.form.to_dict(flat=True)
    image_data = request.files.to_dict(flat=True)

    if not data:
        return jsonify({"error": "Invalid request"}), 400

    user_input = data.get("message", "")
    image = image_data.get("image", None)
    image_result = data.get("imageRecognitionResult", None)
    healthConditions = data.get("healthConditions", None)
    diet = data.get("diet", None)
    allergies = data.get("allergies", None)
    favouriteDishes = data.get("favouriteDishes", None)
    dislikedDishes = data.get("dislikedDishes", None)
    user_id = data.get("userId", None)
    chat_id = data.get("chatId", None)

    if not user_input or not user_id:
        logger.info("Something happens here!")
        return jsonify({"error": "Missing message or userId"}), 400

    image_result_info = ""
    nutrition_message = ""
    reply = ""
    response_for_frontend = ""

    image_binary = None
    if image:
        image_bytes = image.read()
        image_binary = Binary(image_bytes)

    logger.info(
        "Message: %s, UserID: %s, ChatID: %s, Image recoginition result: %s",
        user_input,
        user_id,
        chat_id,
        image_result,
    )

    # Prepare base history entry for saving
    history_entry = {
        'user_message': user_input,
        'image': image_binary,
        'image_result': "",
        'nutrition_message': "",
        'bot_message': ""
    }
    # Process image recognition result
    if image_result:
        try:
            json_compatible_str = image_result.replace("'", '"')
            parsed_result = json.loads(json_compatible_str)

            if isinstance(parsed_result, list):
                info_lines = []
                for item in parsed_result:
                    name = item.get('name', 'N/A')
                    confidence = item.get('confidence', 0.0)
                    macros = item.get('macronutrients', {})
                    kcal = macros.get('Kilocalories', 'N/A')
                    protein = macros.get('Protein', 'N/A')
                    carbs = macros.get('Carbohydrates', 'N/A')
                    fat = macros.get('Fat', 'N/A')

                    line = f"\n{name} (confidence: {confidence:.4f})\n"
                    line += f"    Macronutrients for {name} per 100 grams:\n"
                    line += f"    Energy: {kcal} kcal\n"
                    line += f"    Protein: {protein} g\n"
                    line += f"    Carbohydrates: {carbs} g\n"
                    line += f"    Fat: {fat} g\n"
                    info_lines.append(line)
                
                image_result_info = "\n".join(info_lines)
                history_entry['image_result'] = image_result_info
            else:
                logger.warning("Parsed image_result is not a list")
        
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to parse image recognition result JSON: {json_err}")
        
        except Exception as e:
            logger.error("Error processing image recognition result: ", e)

    # Fetch chat history from database
    history_from_db = list(
        chat_collection.find({"chat_id": chat_id}).sort("_id", -1).limit(10)
    )
    logger.info("History from DB: %s", history_from_db)

    # Handle the chat history for the model
    if history_from_db:
        chat_history = [
            {
                "role": "system",
                "content": "You are a helpful nutrition assistant. Analyze given nutritional information, but do not add any values, and give short feedback of the nutritional values and give better and healthier options.",
            }
        ]
        for item in history_from_db:
            if item.get("user_message"):
                chat_history.append({"role": "user", "content": item["user_message"]})
            if item.get("bot_message"):
                chat_history.append(
                    {"role": "assistant", "content": item["bot_message"]}
                )

    else:
        chat_history = [
            {
                "role": "system",
                "content": "You are a helpful nutrition assistant. Analyze given nutritional information, but do not add any values, and give short feedback of the nutritional values and give better and healthier options.",
            }
        ]

    chat_history.append({"role": "user", "content": user_input})

    model = "llama3.1"

    if image_result_info:
        prompt = f"""
        Analyze the following image recognition results in the context of the user's query, and take the user's profile information into account, if there is any information available:
            - User's health conditions: {healthConditions}
            - User's diet: {diet}
            - User's allergies: {allergies}
            - User's favourite dishes: {favouriteDishes}
            - User's disliked dishes: {dislikedDishes}.
        \n\nImage Results:\n---\n{image_result_info}\n---\n\nUser Query: '{user_input}'
        """
        chat_history.append({"role": "user", "content": prompt})

        response = ollama.chat(model=model, messages=chat_history)
        reply = response["message"]["content"].strip()
        response_for_frontend = f"Recognized food items from the image:\n\n{image_result_info}\n\n{reply}"

    
    else:
        # Extract food info from user input
        food_list = sort_foods_input(user_input)

        if food_list:

            for food in food_list:
                # Get nutrition data from Fineli API
                nutrition_info = get_nutritional_values(food.upper())

                # Make sure that nutrition_info is dictionary. Give custom prompt if that is the case.
                if isinstance(nutrition_info, dict):
                    # If food ID found, format the nutritional info and ask the model to analyze
                    temporary_message = f"\nHere is the nutritional analysis per 100g from Fineli for {food.lower()}:\n"
                    temporary_message += (
                        f"Calories: {nutrition_info['Calories']:.3f} kcal\n"
                    )
                    temporary_message += f"Protein: {nutrition_info['Protein']:.3f} g\n"
                    temporary_message += f"Fat: {nutrition_info['Fat']:.3f} g\n"
                    temporary_message += (
                        f"Carbohydrates: {nutrition_info['Carbohydrates']:.3f} g\n"
                    )
                    temporary_message += f"Fiber: {nutrition_info['Fiber']:.3f} g\n"

                    nutrition_message += temporary_message
                    history_entry['nutrition_message'] = nutrition_message
                
                else:
                    nutrition_message += "EMPTY"
                    history_entry['nutrition_message'] = nutrition_message

            

            if nutrition_message:
                prompt = f"""
                You are NutriVision, an intelligent and friendly AI assistant that helps users with nutrition analysis and personalized healthy food suggestions.

                Your job:
                1. Use the nutritional data provided below to answer food-related questions clearly and accurately.
                2. If no verified data is available for a food item, try to estimate based on your knowledge, but always add this disclaimer:
                **DISCLAIMER** Nutritional information not found in the Fineli database. These values might not be correct.
                3. Always consider the user's profile information in your analysis and recommendations, if the user has provided any information:
                    - User's health conditions: {healthConditions}
                    - User's diet: {diet}
                    - User's allergies: {allergies}
                    - User's favourite dishes: {favouriteDishes}
                    - User's disliked dishes: {dislikedDishes}.
                4. Respond naturally to greetings like "Hi", "Hello", and follow-up inputs like "Yes", "No", "Thanks", or questions like "What should I eat instead?" or "Is this healthy?".
                5. If the user gives vague input or continues the conversation, assume context from the previous message and guide them.
                6. Keep responses short, helpful, and friendly. Ask clarifying questions if needed.

                Here is the nutritional data for: {user_input}
                ---
                {nutrition_message}
                ---

                Respond as NutriVision:
                """

                # Append nutritional information to the chat history for the assistant to process
                chat_history.append({"role": "user", "content": prompt})

                # Generate response
                response = ollama.chat(model=model, messages=chat_history)
                reply = response["message"]["content"].strip()
                if nutrition_message != "EMPTY":
                    response_for_frontend = f"{nutrition_message}\n\n{reply}"
                else:
                    response_for_frontend = reply
            
            else:
                logger.info("No data from Fineli, treating message as a general query")
                food_list = []

            logger.info("User Message: %s", user_input)
            logger.info("Nutrition message: %s", nutrition_message)
            logger.info("Reply: %s", reply)

            
        else:
            prompt = f"""
            Answer to this {user_input} as well as you can. If it is a question try to answer with your knowledge. If it is a greeting or goodbye, answer politely.
            Also take note the user's profile information in your answer, if it would be suitable for it and the user has provided any information:
                - User's health conditions: {healthConditions}
                - User's diet: {diet}
                - User's allergies: {allergies}
                - User's favourite dishes: {favouriteDishes}
                - User's disliked dishes: {dislikedDishes}.
            """
            chat_history.append({"role": "user", "content": prompt})

            # Generate response
            response = ollama.chat(model=model, messages=chat_history)
            reply = response["message"]["content"].strip()
            response_for_frontend = reply

        logger.info("User Message: %s", user_input)
        logger.info("Reply: %s", reply)
        
    history_entry['bot_message'] = reply

    chat_collection.update_one(
        {"chat_id": chat_id},
        {
            "$push": {
                'history' : history_entry
            }
        }
    )

    return jsonify(
        {
            "response": response_for_frontend
        }
    )


@app.route("/chat_history/<user_id>", methods=["POST"])
def create_new_chat(user_id):
    try:
        # Get chat_id and chat_name from payload
        data = request.get_json()
        chat_id = data.get("chatId")
        chat_name = data.get("chatName")

        # Create new chat
        new_chat = {
            "user_id": user_id,
            "chat_id": chat_id,
            "chat_name": chat_name,
            "history": [],
            "createdAt": datetime.now(timezone.utc),
        }

        # Insert new chat to MongoDB
        chat_collection.insert_one(new_chat)

        return jsonify({"message": "New chat created successfully"}), 201
    except Exception as e:
        logger.error("Error creating chat: %s", e)
        return jsonify({"error": "Failed to create chat"}), 500


@app.route("/chat_history/<user_id>", methods=["GET"])
def get_chat_list(user_id):
    try:
        # Find all chat_ids and chat_names based on user_id
        chats = list(chat_collection.find({"user_id": user_id}))
        chat_list = []
        for chat in chats:
            chat_list.append(
                {"id": chat.get("chat_id", ""), "name": chat.get("chat_name", "")}
            )
        return jsonify(chat_list)
    except Exception as e:
        logger.error("Error in get_chat_list: %s", e)
        return jsonify({"error": "Failed to load chat history"}), 500


@app.route("/chat_one", methods=["GET"])
def get_chat_history():
    try:
        # Get user_id and chat_id from parameters
        user_id = request.args.get("userId")
        chat_id = request.args.get("chatId")

        # Find the correct object from MongoDB to get chat history
        chat_document = chat_collection.find_one({"user_id": user_id, "chat_id": chat_id})
        # Make sure to return only the history array from database
        if chat_document and 'history' in chat_document:
            history = []
            for message in chat_document.get("history", []):
                processed_message = {
                    'user_message': message.get('user_message'),
                    'bot_message': message.get('bot_message'),
                    'image_result': message.get('image_result'),
                    'nutrition_message': message.get('nutrition_message'),
                    'image': None
                }

                if "image" in message and message["image"] is not None:
                    image_binary = message["image"]
                    encoded_image = base64.b64encode(image_binary).decode("utf-8")
                    kind = filetype.guess(image_binary)
                    if not kind:
                        kind = "image/jpeg"

                    processed_message['image'] = f"data:{kind};base64,{encoded_image}"
                
                history.append(processed_message)

            logger.info(f"Returning {len(history)} history items for chat_id: {chat_id}")
            return jsonify(history)

        logger.info(f"No history found for chat_id: {chat_id}")
        return jsonify({"error": "No chat history found"}), 404

    except Exception as e:
        logger.error("Error loading chat history: %s", e)
        return jsonify({"error": "Failed to load chat history"}), 500


@app.route("/chat_history/<user_id>", methods=["DELETE"])
def delete_chat_history(user_id):
    try:
        # Get chat_id from payload
        data = request.get_json()
        chat_id = data.get("chatId", None)

        if not chat_id:
            return jsonify({"error": "chatId is required to delete chat history"}), 401

        # Find the right chat_history object to delete from mongo
        deleted_chat = db.chat_history.delete_one(
            {"user_id": user_id, "chat_id": chat_id}
        )
        logger.info("DELETED CHAT COUNT: %s", deleted_chat.deleted_count)

        # Check if correct chat was found and deleted
        if deleted_chat.deleted_count == 0:
            return jsonify({"error": "Chat not found"}), 400
        return jsonify({"message": "Chat deleted successfully"}), 200

    except Exception as e:
        logger.error("Error deleting chat history: %s", e)
        return jsonify({"error": "Failed to delete chat history"}), 500


if __name__ == "__main__":
    app.run(debug=True)

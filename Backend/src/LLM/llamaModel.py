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
from datetime import datetime, timezone

import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


import ast
app = Flask(__name__)
CORS(app)

#Set up MongoDB: user URI to connect, create new collection
mongo_uri = os.environ.get('MONGODB_URI')
client = MongoClient(mongo_uri)
db = client['NutriVision']
chat_collection = db['chat_history']

#Make sure chats are deleted after 30 days
#chat_collection.create_index("createdAt", expireAfterSeconds=60*60*24*30)

food_data = pandas.read_csv('foodname_EN.csv', encoding="ISO-8859-1", delimiter=';')

def get_food_id(food_name):
    #Try to find the best match for a food in Fineli database.
    #Check for an exact match in the database.
    exact_match = food_data[food_data["FOODNAME"] == food_name]
    if not exact_match.empty:
        return exact_match.iloc[0]["FOODID"]
    
    #Check for a match that starts with food name in database.
    startswith_match = food_data[food_data["FOODNAME"].str.startswith(food_name)]
    if not startswith_match.empty:
        return startswith_match.iloc[0]["FOODID"]

    #Check for a match that contains food name in database.
    contains_match = food_data[food_data["FOODNAME"].str.contains(food_name)]
    if not contains_match.empty:
        return contains_match.iloc[0]["FOODID"]
    
    return "Food ID not found in database."

def get_nutritional_values(food_name):
    #Get food ID and fetch data from Fineli API.
    food_id = get_food_id(food_name)
    if not food_id:
        return f"Food '{food_name}' not found in database."

    else:
        url = f"https://fineli.fi/fineli/api/v1/foods/{food_id}"
        headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
        }
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            data = response.json()
            #Get the data from Fineli API and sort it out.
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
    #Give prompt for the model to sort out foods from the user input.
    prompt = f"""
        I need you to extract a list of foods mentioned in the following user input:

        "{user_input}"

        Important instructions:
        - Return ONLY a list of food items actually mentioned in the input.
        - If there are NO food items, respond with: NONE
        - Return the list in a plain comma-separated format, e.g., "Food1", "Food2", "Food3" (NO square brackets).
        - Do NOT guess or make up foods. Only use what is explicitly stated in the user input.
    """
    response = ollama.chat(model='llama3.1', messages=[{"role": "user", "content": prompt}])
    sorted_foods = response["message"]["content"].strip()

    #Check if there are foods in the response.
    food_list = []
    if sorted_foods.upper() == 'NONE':
        return food_list
    #Make a list of the response by splitting the string and then removing leading spaces using strip() method.
    else:
        for food in sorted_foods.split(','):
            food_list.append(food.strip())
        return food_list
    
    
@app.route('/chat', methods=['POST'])
def chat_handler():
    data = request.form.to_dict(flat=True)
    image_data = request.files.to_dict(flat=True)

    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    user_input = data.get('message', '')
    image = image_data.get('image', None)
    image_result = data.get('imageRecognitionResult', None)
    diet = data.get('diet', None)
    allergies = data.get('Allergies', None)
    favouriteDishes = data.get('favouriteDishes', None)
    dislikedDishes = data.get('dislikedDishes', None)
    user_id = data.get('userId', None)
    chat_id = data.get('chatId', None)

    image_binary = None

    if image:
        image_bytes = image.read()
        image_binary = Binary(image_bytes)

    print(f"Message: {user_input}, UserID: {user_id}, ChatID: {chat_id}, Image recoginition result: {image_result}")

    if not user_input or not user_id:
        print("Something happens here!")
        return jsonify({'error': 'Missing message or userId'}), 400

    #Fetch chat history from database
    history_from_db = list(chat_collection.find({'chat_id': chat_id}).sort('_id', -1).limit(10))
    print("History from DB: ", history_from_db)

    #Handle the chat history for the model
    if history_from_db:
        chat_history =[{'role': 'system', 'content': 'You are a helpful nutrition assistant. Analyze given nutritional information, but do not add any values, and give short feedback of the nutritional values and give better and healthier options.'}]
        for item in history_from_db:
            if item.get('user_message'):
                chat_history.append({'role': 'user', 'content': item['user_message']})
            if item.get('bot_message'):
                chat_history.append({'role': 'assistant', 'content': item['bot_message']})
    
    else:
        chat_history =[{'role': 'system', 'content': 'You are a helpful nutrition assistant. Analyze given nutritional information, but do not add any values, and give short feedback of the nutritional values and give better and healthier options.'}]
    
    chat_history.append({'role': 'user', 'content': user_input})
    
    model = 'llama3.1'

    #Extract food info from user input
    food_list = sort_foods_input(user_input)

    if food_list:

        nutrition_message = ""

        for food in food_list:
            # Get nutrition data from Fineli API
            nutrition_info = get_nutritional_values(food.upper())

            #Make sure that nutrition_info is dictionary. Give custom prompt if that is the case.
            if isinstance(nutrition_info, dict):
                # If food ID found, format the nutritional info and ask the model to analyze
                temporary_message = f"\nHere is the nutritional analysis per 100g from Fineli for {food.lower()}:\n"
                temporary_message += f"Calories: {nutrition_info['Calories']:.3f} kcal\n"
                temporary_message += f"Protein: {nutrition_info['Protein']:.3f} g\n"
                temporary_message += f"Fat: {nutrition_info['Fat']:.3f} g\n"
                temporary_message += f"Carbohydrates: {nutrition_info['Carbohydrates']:.3f} g\n"
                temporary_message += f"Fiber: {nutrition_info['Fiber']:.3f} g\n"

            nutrition_message += temporary_message

    if result:
        result_list = ast.literal_eval(result)
        recognized_foods = list(map(lambda food: food.get('name'), result_list))              

    if nutrition_message:
        if not result:
            prompt = f"""
            You are NutriVision, an AI assistant providing accurate nutritional information.

            Here is the exact nutritional data retrieved for {user_input}. Use this information only—do not estimate or add missing values.

            ---
            {nutrition_message}
            ---
            ---
            {nutrition_message}
            ---

            Repeat these values exactly as provided before any analysis. 
            Please, add nutritional values yourself for foods that do not have analysis yet, but add a disclaimer for these foods: **DISCLAIMER** Nutritional information not found in Fineli database. These values might not be correct!
            """

            # Append nutritional information to the chat history for the assistant to process
            chat_history.append({'role': 'assistant', 'content': prompt})
        else:
            prompt = f"""
            You are NutriVision, an AI assistant providing accurate nutritional information.

            For each recognized food item in the following list, {recognized_foods}, provide a detailed analysis of them but without giving any values regarding the nutritional information as they are already known.
        
            After the analysis of recognized food items, do the following next:

            Here is the exact nutritional data retrieved for {user_input}. Use this information only—do not estimate or add missing values.

            ---
            {nutrition_message}
            ---

            Repeat these values exactly as provided before any analysis. 
            Please, add nutritional values yourself for foods that do not have analysis yet, but add a disclaimer for these foods: **DISCLAIMER** Nutritional information not found in Fineli database. These values might not be correct!

            Here are the recognized food items from the image: {recognized_foods}
            """
            
            # Append nutritional information to the chat history for the assistant to process
            chat_history.append({'role': 'assistant', 'content': prompt})
    else:
        if result:
            prompt = f"""
            You are NutriVision, an AI assistant providing accurate nutritional information.

            User has submitted a food image in which the following food items were recognized: {recognized_foods}.

            For each recognized food item, provide a detailed analysis of them but without giving any values regarding the nutritional information as they are already known.
            
            At the end of the analysis, consider healthier alternatives and provide suggestions for better food choices for the dish.
            """
            # Append nutritional information to the chat history for the assistant to process
            chat_history.append({'role': 'assistant', 'content': prompt})

        #Generate response
        response = ollama.chat(model=model, messages=chat_history)
        reply = response['message']['content'].strip()

        print(f"User Message: {user_input}")
        print(f"Nutrition message: {nutrition_message}")
        print(f"Reply: {reply}")

        #Update chat history in the database
        chat_collection.update_one(
            {'chat_id': chat_id},
            {'$push': {'history': {'user_message': user_input, 'image': image_binary, 'image_result': image_result, 'nutrition_message': nutrition_message, 'bot_message': reply}}},
            upsert=True
        )

        #Return nutrition message and model reply
        return jsonify({'nutrition_message': nutrition_message,
                        'response': reply,
                        })
    
    else:
        prompt = f"""
        Answer to this {user_input} as well as you can. If it is a question try to answer with your knowledge. If it is a greeting or goodbye, answer politely.
        """
        chat_history.append({'role': 'assistant', 'content': prompt})

        #Generate response
        response = ollama.chat(model=model, messages=chat_history)
        reply = response['message']['content'].strip()

        print(f"User Message: {user_input}")
        print(f"Reply: {reply}")

        #Update chat history in the database
        chat_collection.update_one(
            {'chat_id': chat_id},
            {'$push': {'history': {'user_message': user_input, 'image': image_binary, 'image_result': image_result, 'nutrition_message': '', 'bot_message': reply}}},
            upsert=True
        )

        #Return nutrition message and model reply
        return jsonify({'response': reply
                        })
    
@app.route('/chat_history/<user_id>', methods=['POST'])
def create_new_chat(user_id):
    try:
        #Get chat_id and chat_name from payload
        data = request.get_json()
        chat_id = data.get('chatId')
        chat_name = data.get('chatName')

        #Create new chat
        new_chat = {
            'user_id': user_id,
            'chat_id': chat_id,
            'chat_name': chat_name,
            'history': [],
            'createdAt': datetime.now(timezone.utc)
        }

        #Insert new chat to MongoDB
        chat_collection.insert_one(new_chat)

        return jsonify({'message': 'New chat created successfully'}), 201
    except Exception as e:
        print("Error creating chat:", e)
        return jsonify({'error': 'Failed to create chat'}), 500
    
@app.route('/chat_history/<user_id>', methods=['GET'])
def get_chat_list(user_id):
    try:
        #Find all chat_ids and chat_names based on user_id
        chats = list(chat_collection.find({'user_id': user_id}))
        chat_list = []
        for chat in chats:
            chat_list.append({'id': chat.get('chat_id', ''), 'name': chat.get('chat_name', '')})
        return jsonify(chat_list)
    except Exception as e:
        print("Error in get_chat_list: ", e)
        return jsonify({'error': 'Failed to load chat history'}), 500

@app.route('/chat_one', methods=['GET'])
def get_chat_history():
    try:
        #Get user_id and chat_id from parameters
        user_id = request.args.get('userId')
        chat_id = request.args.get('chatId')
        
        #Find the correct object from MongoDB to get chat history
        history_list = list(chat_collection.find({'user_id': user_id, 'chat_id': chat_id}))
        #Make sure to return only the history array from database
        if history_list:
            history = history_list[0]
            history['_id'] = str(history['_id'])

            #Encode image as base64
            for message in history.get('history', []):
                if 'image' in message and message['image'] is not None:
                    image_binary = message['image']
                    encoded_image = base64.b64encode(image_binary).decode('utf-8')
                    message['image'] = encoded_image

            return jsonify(history.get('history', []))
        
        return jsonify({'error': 'No chat history found'}), 404
    
    except Exception as e:
        print("Error loading chat history: ", e)
        return jsonify({'error': 'Failed to load chat history'}), 500
    
@app.route('/chat_history/<user_id>', methods=['DELETE'])
def delete_chat_history(user_id):
    try:
        #Get chat_id from payload
        data = request.get_json()
        chat_id = data.get('chatId', None)
        
        if not chat_id:
            return jsonify({'error': 'chatId is required to delete chat history'}), 401
        
        #Find the right chat_history object to delete from mongo
        deleted_chat = db.chat_history.delete_one({'user_id': user_id, 'chat_id': chat_id})
        print("DELETED CHAT COUNT: ", deleted_chat.deleted_count)

        #Check if correct chat was found and deleted
        if deleted_chat.deleted_count == 0:
            return jsonify({'error': 'Chat not found'}), 400
        return jsonify({'message': 'Chat deleted successfully'}), 200

    except Exception as e:
        print("Error deleting chat history: ", e)
        return jsonify({'error': 'Failed to delete chat history'}), 500

if __name__ == "__main__":
    app.run(debug=True)

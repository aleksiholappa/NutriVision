import ollama
import os
import json
import pandas
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

mongo_uri = os.environ.get('MONGODB_URI', 'INSERT MONGODB URI HERE')
client = MongoClient(mongo_uri)
db = client['NutriVision']
chat_collection = db['chat_history']

food_data = pandas.read_csv('foodname_EN.csv', encoding="ISO-8859-1", delimiter=';')

def get_food_id(food_name):
    #Find a match from the Fineli database and return the ID.
    match = food_data[food_data["FOODNAME"].str.contains(food_name)]
    if not match.empty:
        return match.iloc[0]["FOODID"]
    else:
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
            I need you to give me a list of foods in the user input, nothing else, just a list of foods mentioned in the following input. 
            {user_input}
            The list has to be in a 'list' form so it's easy to use in Python coding language. Example format: "Food1","Food2","Food3". DO NOT INCLUDE '[' NOR ']'!
            """
    response = ollama.chat(model='llama3.1', messages=[{"role": "user", "content": prompt}])
    sorted_foods = response["message"]["content"].strip()

    #Make a list of the response by splitting the string and then removing leading spaces using strip() method.
    food_list = []
    for food in sorted_foods.split(','):
        food_list.append(food.strip())
    return food_list
    
    
@app.route('/chat', methods=['POST'])
def chat_handler():
    data = request.get_json()

    if not data or 'message' not in data:
        return jsonify({'error': 'Invalid request, missing message'}), 400
    
    user_input = data.get('message', '')
    user_id = data.get('userId', None)
    result = data.get('result', None)

    print(f"Message: {user_input}, UserID: {user_id}, Result: {result}")

    if not user_input or not user_id:
        print("Something happens here!")
        return jsonify({'error': 'Missing message or userId'}), 400

    #Fetch chat history from database
    history_from_db = list(chat_collection.find({'user_id': user_id}).sort('_id', -1).limit(10))
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

    if not food_list:
        return jsonify({'message': "I couldnt identify any food items in your message."}), 400

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
                

    if nutrition_message:
        prompt = f"""
        You are NutriVision, an AI assistant providing accurate nutritional information.

        Here is the exact nutritional data retrieved for {user_input}. Use this information only—do not estimate or add missing values.

        ---
        {nutrition_message}
        ---

        Repeat these values exactly as provided before any analysis. 
        Please, add nutritional values yourself for foods that do not have analysis yet, but add a disclaimer for these foods: **DISCLAIMER** Nutritional information not found in Fineli database. These values might not be correct!
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
        {'user_id': user_id},
        {'$push': {'history': {'user_message': user_input, 'nutrition_message': nutrition_message, 'bot_message': reply}}},
        upsert=True
    )

    #Return nutrition message and model reply
    return jsonify({'nutrition_message': nutrition_message,
                    'response': reply,
                    })

@app.route('/login/chat_history/<user_id>', methods=['GET'])
def get_chat_history(user_id):
    try:
        history = list(chat_collection.find({'user_id': user_id}))
        #Make sure to return only the history array from database
        if history:
            history['_id'] = str(history['_id'])
            return jsonify(history['history'])
        return jsonify({'error': 'No chat history found'}), 404
    except Exception as e:
        print("Error loading chat history: ", e)
        return jsonify({'error': 'Failed to load chat history'}), 500

if __name__ == "__main__":
    app.run(debug=True)

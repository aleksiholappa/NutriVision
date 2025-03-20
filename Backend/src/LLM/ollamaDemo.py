import ollama
import os
import json
import pandas
import requests

food_data = pandas.read_csv('foodname_EN.csv', encoding="ISO-8859-1", delimiter=';')
CHAT_HISTORY = "chat_history.json"

def get_chat_history():
    #Load chat history from JSON file if one exists
    if os.path.exists(CHAT_HISTORY):
        with open(CHAT_HISTORY, "r") as file:
            return json.load(file)
    #If JSON file does not exist, start with system prompt
    else:
        return [{'role': 'system', 'content': 'You are a helpful nutrition assistant. Analyze given nutritional information, but do not add any values, and give short feedback of the nutritional values.'}]

def update_chat_history(chat_history):
    #Save chat history to a JSON file
    with open(CHAT_HISTORY, "w") as file:
        json.dump(chat_history, file)

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
    
    

def main():
    model = 'llama3.1'
    print("NutriVision assistant is ready! Type 'exit' to quit.\n\n*DISCLAIMER*\nSome nutritional values might not be accurate, especially ones that do not come directly from Fineli API!\n")

    # Initialize the conversation history
    chat_history = get_chat_history()

    while True:
        user_input = input("Tell me about the meal you had: ")
        if user_input.lower() in ["exit", "quit", "bye bye"]:
            print("NutriVision assistant: Goodbye! Have a nice and healthy day! :)")
            break

        #Add user input to chat history
        chat_history.append({'role': 'user', 'content': user_input})

        #Extract food info from user input
        food_list = sort_foods_input(user_input)
        print("TÄSSÄ ON FOOD_LIST: ", food_list)
        
        nutrition_message = " "

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
            print(nutrition_message)

        #Generate response
        response = ollama.chat(model=model, messages=chat_history)
        reply = response['message']['content'].strip()

        #Add response to chat history
        chat_history.append({'role': 'assistant', 'content': reply})
        
        #Update chat history
        update_chat_history(chat_history)

        #Print reply
        print(f"NutriVision assistant: {reply}\n")

if __name__ == "__main__":
    main()
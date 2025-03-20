from clarifai_grpc.channel.clarifai_channel import ClarifaiChannel
from clarifai_grpc.grpc.api import resources_pb2, service_pb2, service_pb2_grpc
from clarifai_grpc.grpc.api.status import status_code_pb2
import csv

PAT = ""
USER_ID = "holappa" 
APP_ID = "food_recognition"
MODEL_ID = "food-item-v1-recognition"
IMAGE_PATH = "" 

channel = ClarifaiChannel.get_grpc_channel()
stub = service_pb2_grpc.V2Stub(channel)

metadata = (("authorization", f"Key {PAT}"),)

userDataObject = resources_pb2.UserAppIDSet(user_id=USER_ID, app_id=APP_ID)

with open(IMAGE_PATH, "rb") as f:
    image_bytes = f.read()

post_model_outputs_response = stub.PostModelOutputs(
    service_pb2.PostModelOutputsRequest(
        user_app_id=userDataObject,
        model_id=MODEL_ID,
        inputs=[
            resources_pb2.Input(
                data=resources_pb2.Data(
                    image=resources_pb2.Image(
                        base64=image_bytes
                    )
                )
            )
        ]
    ),
    metadata=metadata
)
if post_model_outputs_response.status.code != status_code_pb2.SUCCESS:
    print(post_model_outputs_response.status)
    raise Exception("Post model outputs failed, status: " + post_model_outputs_response.status.description)

def get_food_id(food_name, csv_file):
    with open(csv_file, mode='r', encoding='ISO-8859-1') as file:
        reader = csv.DictReader(file, delimiter=';')
        for row in reader:
            food = row["FOODNAME"].split(",")[0].strip().lower()
            if food == food_name.strip().lower():
                return row["FOODID"]
    return None

def get_macronutrients(food_id, csv_file):
    macronutrients = {"Kilocalories": None, "Protein": None, "Carbohydrates": None, "Fat": None}
    eufdname = {"ENERC": "Kilocalories", "PROT": "Protein", "CHOAVL": "Carbohydrates", "FAT": "Fat"}
    with open(csv_file, mode='r', encoding='ISO-8859-1') as file:
        reader = csv.reader(file, delimiter=';')
        for row in reader:
            if row[0] == str(food_id) and row[1] in eufdname:
                value = float(row[2].replace(",", "."))
                if row[1] == "ENERC":
                    value = round(value * 0.239, 2)
                macronutrients[eufdname[row[1]]] = value
    return macronutrients

for output in post_model_outputs_response.outputs:
    if hasattr(output.data, "concepts") and output.data.concepts:
        print("Detected food items:")
        for concept in output.data.concepts:
            if concept.value > 0.75:  # Confidence threshold
                print(f"\n{concept.name}, {concept.value:.4f}")
                food_id = get_food_id(concept.name, "foodname_EN.csv")
                if food_id != None:
                    macronutrients = get_macronutrients(food_id, "component_value.csv")
                    print(f"Macronutrients for {concept.name} / 100 grams:")
                    for key, value in macronutrients.items():
                        print(f"{key}: {value}")
                else:
                    print(f"Food item {concept.name} not found in database.")
    else:
        print("No food items detected in output.")
        
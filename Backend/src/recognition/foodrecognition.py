from clarifai_grpc.channel.clarifai_channel import ClarifaiChannel
from clarifai_grpc.grpc.api import resources_pb2, service_pb2, service_pb2_grpc
from clarifai_grpc.grpc.api.status import status_code_pb2
import csv
from rapidfuzz import fuzz, process
import dotenv
import os

dotenv.load_dotenv()
PAT = os.getenv("PAT", "")
USER_ID = os.getenv("USER_ID", "")
APP_ID = os.getenv("APP_ID", "")
MODEL_ID = os.getenv("MODEL_ID", "")


def initialize_model(image_bytes):
    channel = ClarifaiChannel.get_grpc_channel()
    stub = service_pb2_grpc.V2Stub(channel)

    metadata = (("authorization", f"Key {PAT}"),)

    userDataObject = resources_pb2.UserAppIDSet(user_id=USER_ID, app_id=APP_ID)

    post_model_outputs_response = stub.PostModelOutputs(
        service_pb2.PostModelOutputsRequest(
            user_app_id=userDataObject,
            model_id=MODEL_ID,
            inputs=[
                resources_pb2.Input(
                    data=resources_pb2.Data(
                        image=resources_pb2.Image(base64=image_bytes)
                    )
                )
            ],
        ),
        metadata=metadata,
    )
    if post_model_outputs_response.status.code != status_code_pb2.SUCCESS:
        print(post_model_outputs_response.status)
        raise Exception(
            "Post model outputs failed, status: "
            + post_model_outputs_response.status.description
        )
    return post_model_outputs_response


def get_food_id(food_name, csv_file):
    with open(csv_file, mode="r", encoding="ISO-8859-1") as file:
        matches = {}
        fuzzwords = {}
        reader = csv.DictReader(file, delimiter=";")
        for row in reader:
            food = row["FOODNAME"].split(",")[0].strip().lower()
            food_full = row["FOODNAME"].strip().lower()
            if food == food_name.strip().lower():
                return row["FOODID"]
            if food_name.strip().lower() in food_full:
                matches[food_full] = row["FOODID"]
            fuzzwords[food] = row["FOODID"]
        if matches:
            return list(matches.values())[0]
        similarities = process.extractOne(
            food_name, fuzzwords.keys(), scorer=fuzz.ratio
        )
        if similarities[1] > 80:
            return fuzzwords[similarities[0]]
    return None


def get_macronutrients(food_id, csv_file):
    macronutrients = {
        "Kilocalories": None,
        "Protein": None,
        "Carbohydrates": None,
        "Fat": None,
    }
    eufdname = {
        "ENERC": "Kilocalories",
        "PROT": "Protein",
        "CHOAVL": "Carbohydrates",
        "FAT": "Fat",
    }
    with open(csv_file, mode="r", encoding="ISO-8859-1") as file:
        reader = csv.reader(file, delimiter=";")
        for row in reader:
            if row[0] == str(food_id) and row[1] in eufdname:
                value = float(row[2].replace(",", "."))
                if row[1] == "ENERC":
                    value = round(value * 0.239, 2)  # kJ to kcal
                macronutrients[eufdname[row[1]]] = value
    return macronutrients


def detect_food_items(post_model_outputs_response):
    items = []
    for output in post_model_outputs_response.outputs:
        if hasattr(output.data, "concepts") and output.data.concepts:
            for concept in output.data.concepts:
                if concept.value > 0.75:  # Confidence threshold
                    food_id = get_food_id(concept.name, "foodname_EN.csv")
                    if food_id:
                        macronutrients = get_macronutrients(
                            food_id, "component_value.csv"
                        )
                        document = {
                            "name": concept.name,
                            "confidence": round(concept.value, 4),
                            "macronutrients": macronutrients,
                        }
                        items.append(document)
                    else:
                        document = {
                            "name": concept.name,
                            "confidence": round(concept.value, 4),
                        }
                        items.append(document)
        else:
            raise Exception("No food items detected in output.")

    return items


def recognize_image(file_path):
    with open(file_path, "rb") as f:
        image_bytes = f.read()
    post_model_outputs_response = initialize_model(image_bytes)
    return detect_food_items(post_model_outputs_response)

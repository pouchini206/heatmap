# layout_parser.py
import sys
import json
import cv2
import layoutparser as lp

def main(image_path):
    try:
        # Use a built-in LayoutParser model (PubLayNet is a generic one)
        model = lp.Detectron2LayoutModel(
            config_path='lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config',
            label_map={0: "text", 1: "title", 2: "list", 3: "table", 4: "figure"},
            extra_config=["MODEL.ROI_HEADS.SCORE_THRESH_TEST", 0.5],
        )
    except Exception as e:
        print(json.dumps({"error": "Model load error", "details": str(e)}))
        sys.exit(1)

    image = cv2.imread(image_path)
    if image is None:
        # If the image failed to load, return an empty list or an error
        print(json.dumps({"error": "Could not read image"}))
        sys.exit(1)

    try:
        layout = model.detect(image)
        detections = []
        for block in layout:
            x1, y1, x2, y2 = block.coordinates
            detections.append({
                "x": int(x1),
                "y": int(y1),
                "width": int(x2 - x1),
                "height": int(y2 - y1),
                "label": block.type
            })
        print(json.dumps(detections))
    except Exception as e:
        print(json.dumps({"error": "Detection error", "details": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 layout_parser.py <image_path>")
        sys.exit(1)
    main(sys.argv[1])

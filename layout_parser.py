# layout_parser.py
import sys
import json
import cv2
import layoutparser as lp

def main(image_path):
    # Load a pre-trained LayoutParser model (PubLayNet model for demonstration)
    model = lp.Detectron2LayoutModel(
        config_path='lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config',
        label_map={0: "text", 1: "title", 2: "list", 3: "table", 4: "figure"},
        extra_config=["MODEL.ROI_HEADS.SCORE_THRESH_TEST", 0.5],
    )
    
    image = cv2.imread(image_path)
    if image is None:
        print(json.dumps([]))
        return

    layout = model.detect(image)
    detections = []
    for block in layout:
        # Get coordinates for each detected block
        x1, y1, x2, y2 = block.coordinates
        detections.append({
            "x": x1,
            "y": y1,
            "width": x2 - x1,
            "height": y2 - y1,
            "label": block.type
        })
    print(json.dumps(detections))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python layout_parser.py <image_path>")
        sys.exit(1)
    main(sys.argv[1])

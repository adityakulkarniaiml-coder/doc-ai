import cv2
import numpy as np
import pytesseract
import os

# Important: Update this path to where Tesseract is installed on your computer
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def order_points(pts):
    """Orders coordinates to: top-left, top-right, bottom-right, bottom-left"""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def process_and_extract(image_path: str, output_pdf_path: str):
    """Applies DIP techniques, extracts text, and generates a PDF"""
    # 1. Load Image and convert to Grayscale
    image = cv2.imread(image_path)
    ratio = image.shape[0] / 500.0
    orig = image.copy()
    image = cv2.resize(image, (int(image.shape[1] / ratio), 500))
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # 2. Gaussian Blur to remove noise
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # 3. Canny Edge Detection
    edged = cv2.Canny(gray, 75, 200)

    # 4. Find Contours (Looking for the document paper)
    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    
    screenCnt = None
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4: # Found a rectangle (the paper)
            screenCnt = approx
            break

    # 5. Perspective Transform (Homography / Deskew)
    if screenCnt is not None:
        pts = screenCnt.reshape(4, 2) * ratio
        rect = order_points(pts)
        (tl, tr, br, bl) = rect

        widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        maxWidth = max(int(widthA), int(widthB))

        heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        maxHeight = max(int(heightA), int(heightB))

        dst = np.array([
            [0, 0],
            [maxWidth - 1, 0],
            [maxWidth - 1, maxHeight - 1],
            [0, maxHeight - 1]], dtype="float32")

        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(orig, M, (maxWidth, maxHeight))
    else:
        # If edge detection fails, process the whole original image
        warped = orig 

    # 6. Adaptive Thresholding (Binarization to clean shadows)
    warped_gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    cleaned_doc = cv2.adaptiveThreshold(
        warped_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # 7. Extract raw text using Tesseract
    extracted_text = pytesseract.image_to_string(cleaned_doc)

    # 8. Generate Searchable PDF using Tesseract's built-in PDF generator
    pdf = pytesseract.image_to_pdf_or_hocr(cleaned_doc, extension='pdf')
    with open(output_pdf_path, 'wb') as f:
        f.write(pdf)

    return extracted_text

# You can test this file locally by running it directly:
if __name__ == "__main__":
    # Put a test image in your folder named 'test.jpg'
    # text = process_and_extract("test.jpg", "output.pdf")
    # print(text)
    pass
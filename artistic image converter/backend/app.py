import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import logging

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER_NAME = 'uploads'
if not os.path.exists(UPLOAD_FOLDER_NAME):
    os.makedirs(UPLOAD_FOLDER_NAME)

STATIC_FOLDER = os.path.join('static', UPLOAD_FOLDER_NAME)
MAX_CONTENT_LENGTH = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def pencil_sketch(image, blur_kernel_size=21):
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    inverted_gray_image = 255 - gray_image
    if blur_kernel_size % 2 == 0:
        blur_kernel_size += 1
    blurred_image = cv2.GaussianBlur(inverted_gray_image, (blur_kernel_size, blur_kernel_size), 0)
    inverted_blurred_image = 255 - blurred_image
    sketch_image = cv2.divide(gray_image, inverted_blurred_image, scale=256.0)
    sketch_image_bgr = cv2.cvtColor(sketch_image.astype(np.uint8), cv2.COLOR_GRAY2BGR)
    return sketch_image_bgr

def cartoon_effect(image, brightness_factor=1.0, denoising_strength=0.75):
    for _ in range(7):
        image = cv2.bilateralFilter(image, 9, 75, 75)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 5)
    edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 9)
    edges = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    image_brightened = cv2.convertScaleAbs(image, alpha=brightness_factor, beta=0)
    cartoon_image = cv2.bitwise_and(image_brightened, edges)
    if denoising_strength > 0:
        cartoon_image = cv2.fastNlMeansDenoisingColored(
            cartoon_image, None,
            int(denoising_strength * 30),
            int(denoising_strength * 10),
            7, 21
        )
    return cartoon_image

def oil_paint_effect(image, brightness_factor=1.0, oil_paint_intensity=50):
    img_brightened = cv2.convertScaleAbs(image, alpha=brightness_factor, beta=0)
    radius = int(np.interp(oil_paint_intensity, [10, 100], [3, 15]))
    dyn_ratio = 1
    oil_painted_image = cv2.xphoto.oilPainting(img_brightened, radius, dyn_ratio)
    return oil_painted_image

def watercolor_effect(image, sigma_s=60, sigma_r=0.6):
    watercolor_image = cv2.stylization(image, sigma_s=sigma_s, sigma_r=sigma_r)
    return watercolor_image

def neon_glow_effect(image, canny_low_threshold=100, canny_high_threshold=200, dilation_kernel_size=3):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, canny_low_threshold, canny_high_threshold)
    edges_inv = 255 - edges
    colored_edges = np.zeros_like(image)
    if dilation_kernel_size > 0:
        kernel = np.ones((dilation_kernel_size, dilation_kernel_size), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=1)
    neon_color = (0, 255, 255)
    colored_edges[edges > 0] = neon_color
    final_image = cv2.addWeighted(image, 0.4, colored_edges, 0.6, 0)
    blurred_edges = cv2.GaussianBlur(edges, (5, 5), 0)
    blurred_edges_color = np.zeros_like(image)
    blurred_edges_color[blurred_edges > 0] = neon_color
    final_image = cv2.addWeighted(final_image, 0.8, blurred_edges_color, 0.2, 0)
    return final_image

def ghibli_style(image, bilateral_diameter=9, bilateral_sigma_color=75, bilateral_sigma_space=75,
                 edge_threshold_low=50, edge_threshold_high=150, num_colors=8):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, edge_threshold_low, edge_threshold_high)
    kernel_dilate = np.ones((2, 2), np.uint8)
    edges = cv2.dilate(edges, kernel_dilate, iterations=1)
    edges_colored = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

    data = np.float32(image).reshape((-1, 3))
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    _, labels, centers = cv2.kmeans(data, num_colors, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    centers = np.uint8(centers)
    quantized_image = centers[labels.flatten()].reshape(image.shape)

    stylized_image = quantized_image
    for _ in range(5):
        stylized_image = cv2.bilateralFilter(stylized_image, bilateral_diameter, bilateral_sigma_color, bilateral_sigma_space)

    final_image = cv2.bitwise_and(stylized_image, stylized_image, mask=255 - edges)
    final_image[edges == 255] = [0, 0, 0]
    return final_image

@app.route('/')
def index():
    return jsonify({"message": "Welcome to the Artistic Image Converter API!"})

@app.route('/convert', methods=['POST'])
def convert_image():
    if 'image' not in request.files:
        logger.error("No image part in the request.")
        return jsonify({"error": "No image part"}), 400

    file = request.files['image']
    style = request.form.get('style', 'pencil')

    if file.filename == '':
        logger.error("No selected file.")
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        try:
            in_memory_file = file.read()
            nparr = np.frombuffer(in_memory_file, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                logger.error("Could not decode image.")
                return jsonify({"error": "Could not decode image."}), 400

            logger.info(f"Received image for {style} conversion.")
            converted_image = None

            if style == 'pencil':
                blur_kernel_size = int(request.form.get('blur_kernel_size', 21))
                converted_image = pencil_sketch(img, blur_kernel_size)
            elif style == 'cartoon':
                brightness_factor = float(request.form.get('brightness_factor', 1.0))
                denoising_strength = float(request.form.get('denoising_strength', 0.75))
                converted_image = cartoon_effect(img, brightness_factor, denoising_strength)
            elif style == 'oil_paint':
                brightness_factor = float(request.form.get('brightness_factor', 1.0))
                oil_paint_intensity = int(request.form.get('oil_paint_intensity', 50))
                converted_image = oil_paint_effect(img, brightness_factor, oil_paint_intensity)
            elif style == 'watercolor':
                sigma_s = int(request.form.get('watercolor_sigma_s', 60))
                sigma_r = float(request.form.get('watercolor_sigma_r', 0.6))
                converted_image = watercolor_effect(img, sigma_s, sigma_r)
            elif style == 'neon':
                canny_low_threshold = int(request.form.get('neon_canny_low_threshold', 100))
                canny_high_threshold = int(request.form.get('neon_canny_high_threshold', 200))
                dilation_kernel_size = int(request.form.get('neon_dilation_kernel_size', 3))
                converted_image = neon_glow_effect(img, canny_low_threshold, canny_high_threshold, dilation_kernel_size)
            elif style == 'ghibli':
                bilateral_diameter = int(request.form.get('bilateral_diameter', 9))
                bilateral_sigma_color = int(request.form.get('bilateral_sigma_color', 75))
                bilateral_sigma_space = int(request.form.get('bilateral_sigma_space', 75))
                edge_threshold_low = int(request.form.get('edge_threshold_low', 50))
                edge_threshold_high = int(request.form.get('edge_threshold_high', 150))
                num_colors = int(request.form.get('num_colors', 8))
                converted_image = ghibli_style(img, bilateral_diameter, bilateral_sigma_color, bilateral_sigma_space,
                                               edge_threshold_low, edge_threshold_high, num_colors)
            else:
                return jsonify({"error": "Invalid style selected."}), 400

            if converted_image is None:
                return jsonify({"error": "Image processing failed."}), 500

            _, buffer = cv2.imencode('.jpg', converted_image, [cv2.IMWRITE_JPEG_QUALITY, 90])
            converted_image_base64 = base64.b64encode(buffer).decode('utf-8')
            return jsonify({"converted_image_data": converted_image_base64}), 200

        except Exception as e:
            logger.exception("Error during image conversion.")
            return jsonify({"error": str(e)}), 500
    else:
        logger.error(f"File type not allowed: {file.filename}")
        return jsonify({"error": "File type not allowed"}), 400

if __name__ == '__main__':
    app.run(debug=True)

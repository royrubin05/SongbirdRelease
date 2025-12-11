
from PIL import Image
import numpy as np

def remove_background_and_resize(input_path, output_path, scale=2.0):
    try:
        img = Image.open(input_path).convert("RGBA")
        
        # Convert to numpy array
        data = np.array(img)
        
        # identifying white background (allow for some noise)
        r, g, b, a = data.T
        white_areas = (r > 240) & (g > 240) & (b > 240)
        
        # Turn white areas transparent
        data[..., 3][white_areas.T] = 0
        
        img_transparent = Image.fromarray(data)
        
        # Crop tight box
        bbox = img_transparent.getbbox()
        if bbox:
            img_transparent = img_transparent.crop(bbox)
            
        # Resize
        new_size = tuple(int(dim * scale) for dim in img_transparent.size)
        img_final = img_transparent.resize(new_size, Image.Resampling.LANCZOS)
        
        img_final.save(output_path, "PNG")
        print(f"Successfully processed logo to {output_path}")
        
    except Exception as e:
        print(f"Error processing logo: {e}")

remove_background_and_resize(
    "/Users/royrubin/.gemini/antigravity/brain/ac73221e-051b-4a14-bea7-b132a9406999/uploaded_image_1765429210273.png",
    "/Users/royrubin/.gemini/antigravity/scratch/liability-release-app/public/logo.png"
)

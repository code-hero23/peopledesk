from PIL import Image
from collections import Counter

def get_dominant_red(image_path):
    try:
        img = Image.open(image_path)
        img = img.convert("RGB")
        width, height = img.size
        
        red_colors = []
        
        for x in range(width):
            for y in range(height):
                r, g, b = img.getpixel((x, y))
                # Filter for reddish colors (Red is dominant)
                if r > 150 and g < 100 and b < 100:
                    red_colors.append((r, g, b))
        
        if not red_colors:
            return None
            
        # Get most common color
        most_common = Counter(red_colors).most_common(1)[0][0]
        return '#{:02x}{:02x}{:02x}'.format(*most_common)

    except Exception as e:
        print(f"Error: {e}")
        return None

print(get_dominant_red("c:/Users/aravi/Pictures/people-desk/client/public/assets/logo.png"))

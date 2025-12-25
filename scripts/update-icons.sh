#!/bin/bash
set -e

SOURCE_IMAGE="/Users/sumitkumar/.gemini/antigravity/brain/bb1f1733-8fb9-4bdd-939c-af09a02561ee/uploaded_image_1766592044555.jpg"
RES_DIR="android/app/src/main/res"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Source image not found at $SOURCE_IMAGE"
    exit 1
fi

echo "Generating icons from $SOURCE_IMAGE..."

# Function to generate icon
generate_icon() {
    local size=$1
    local folder=$2
    local output="$RES_DIR/$folder/ic_launcher.png"
    local output_round="$RES_DIR/$folder/ic_launcher_round.png"

    echo "Generating $folder ($size x $size)..."
    sips -z $size $size -s format png "$SOURCE_IMAGE" --out "$output"
    sips -z $size $size -s format png "$SOURCE_IMAGE" --out "$output_round"
}

generate_icon 48 "mipmap-mdpi"
generate_icon 72 "mipmap-hdpi"
generate_icon 96 "mipmap-xhdpi"
generate_icon 144 "mipmap-xxhdpi"
generate_icon 192 "mipmap-xxxhdpi"

echo "Icons updated successfully!"

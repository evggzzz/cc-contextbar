#!/usr/bin/env python3
"""Generate assets/demo.gif — an animated cc-contextbar statusline mock."""
from PIL import Image, ImageDraw, ImageFont

W, H = 720, 150
FRAMES = 12          # fill steps
DURATION = 110       # ms per frame
LOOP = 0             # loop forever

BG = (13, 17, 23)
BORDER = (48, 54, 61)
WHITE = (201, 209, 217)
GRAY = (139, 148, 158)
TITLE = (72, 79, 88)
DARKSEG = (33, 38, 45)
GREEN = (63, 185, 80)
YELLOW = (210, 153, 34)
RED = (248, 81, 73)
DOTS = [(255, 95, 86), (255, 189, 46), (39, 201, 63)]

# monospace font (macOS); fall back to default
def load_font(size):
    for p in ("/System/Library/Fonts/Menlo.ttc",
              "/System/Library/Fonts/Monaco.ttf",
              "/System/Library/Fonts/Courier.ttc"):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

FONT = load_font(19)
SMALL = load_font(13)


def color_for(pct):
    if pct < 50:
        return GREEN
    if pct < 80:
        return YELLOW
    return RED


def draw_robot(d, x, y):
    # gray head, green eyes, green antenna
    d.rounded_rectangle([x, y + 6, x + 22, y + 26], radius=5, fill=(110, 118, 128))
    d.ellipse([x + 5, y + 11, x + 11, y + 17], fill=GREEN)
    d.ellipse([x + 14, y + 11, x + 20, y + 17], fill=GREEN)
    d.ellipse([x + 9, y + 1, x + 15, y + 7], fill=GREEN)


def render(pct):
    img = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(img)
    # window
    d.rounded_rectangle([4, 4, W - 5, H - 5], radius=14, fill=BG, outline=BORDER, width=2)
    # traffic dots
    for i, c in enumerate(DOTS):
        d.ellipse([20 + i * 22, 16, 32 + i * 22, 28], fill=c)
    tw = d.textlength("Claude Code", font=SMALL)
    d.text(((W - tw) / 2, 13), "Claude Code", font=SMALL, fill=TITLE)
    d.line([(16, 38), (W - 16, 38)], fill=(33, 38, 45), width=1)

    # statusline line baseline ~ y=72
    y = 60
    draw_robot(d, 26, y)
    d.text((64, y + 6), "glm-5.2[1m]", font=FONT, fill=WHITE)
    d.text((214, y + 6), "·", font=FONT, fill=GRAY)

    # bar
    seg_w, gap, bh = 16, 4, 18
    bx, by = 236, y + 8
    n = 10
    filled = round(pct / 100 * n)
    col = color_for(pct)
    for i in range(n):
        x0 = bx + i * (seg_w + gap)
        c = col if i < filled else DARKSEG
        d.rounded_rectangle([x0, by, x0 + seg_w, by + bh], radius=3, fill=c)
    # pct + cost
    pctstr = f"{pct}%"
    d.text((bx + n * (seg_w + gap) + 6, y + 6), pctstr, font=FONT, fill=WHITE)
    d.text((bx + n * (seg_w + gap) + 6 + d.textlength(pctstr, font=FONT) + 14, y + 6), "·", font=FONT, fill=GRAY)
    cost = pct * 0.11
    cost_x = 540
    coststr = f"${cost:.2f}"
    d.text((cost_x, y + 6), coststr, font=FONT, fill=GREEN)
    return img


frames = []
for i in range(FRAMES):
    pct = 5 + int(i * (95 - 5) / (FRAMES - 1))
    frames.append(render(pct))
# hold the last frame a bit longer by appending a duplicate
frames.append(render(95))

frames[0].save(
    "demo.gif",
    save_all=True,
    append_images=frames[1:],
    duration=DURATION,
    loop=LOOP,
    disposal=2,
)
print(f"wrote demo.gif with {len(frames)} frames")

import re, json

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

sections = re.findall(r'<section class="slide"[^>]*>.*?</section>', text, re.DOTALL)
slide_data = []

for idx, s in enumerate(sections):
    t_match = re.search(r'<h[12][^>]*>(.*?)</h[12]>', s, re.DOTALL)
    title = re.sub(r'<[^>]+>', ' ', t_match.group(1)).strip() if t_match else ''
    title = ' '.join(title.split())
    
    notes_match = re.search(r'data-notes="([^"]*)"', s)
    notes = notes_match.group(1) if notes_match else ''
    
    cards = []
    card_blocks = re.findall(r'<div class="card[^"]*"[^>]*>(.*?)</div>', s, re.DOTALL)
    for c in card_blocks:
        c_text = re.sub(r'<[^>]+>', ' ', c).strip()
        c_text = ' '.join(c_text.split())
        cards.append(c_text)
        
    lead_match = re.search(r'<p class="(?:lead|quote|intro)[^"]*"[^>]*>(.*?)</p>', s, re.DOTALL)
    lead = re.sub(r'<[^>]+>', ' ', lead_match.group(1)).strip() if lead_match else ''
    lead = ' '.join(lead.split())
    
    slide_data.append({
        'index': idx,
        'num': f'{idx+1:02d}',
        'title': title,
        'notes': notes,
        'lead': lead,
        'cards': cards
    })

print(f"Parsed {len(slide_data)} slides successfully.")
for s in slide_data:
    print(f"\n=======================================================")
    print(f"=== SLIDE {s['num']}: {s['title']} ===")
    print(f"=======================================================")
    if s['lead']:
        print(f"Lead: {s['lead']}")
    for i, c in enumerate(s['cards']):
        print(f"  [Card {i+1}]: {c}")
    print(f"Notes: {s['notes']}")


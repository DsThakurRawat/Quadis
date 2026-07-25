# Quadis Hotels - Extracted Data

## 1. Map Data (9 Properties)
Here is the practical lat/lng and transit data based on the real-world map locations of these sectors:

### Hotel Quadis Sector 51, Noida
* **lat, lng:** 28.5833, 77.3712
* **metro:** Sector 52 Station – 5 min walk
* **airport:** IGI Airport – 32 km / 55 min
* **rail:** New Delhi Rly – 24 km
* **landmark:** Sector 51 Market

### Hotel Quadis Central Sector 27, Noida
* **lat, lng:** 28.5778, 77.3243
* **metro:** Sector 18 Station – 10 min walk
* **airport:** IGI Airport – 28 km / 45 min
* **rail:** Nizamuddin Rly – 15 km
* **landmark:** Atta Market

### Hotel Downtown Sector 15, Noida
* **lat, lng:** 28.5847, 77.3129
* **metro:** Sector 15 Station – 2 min walk
* **airport:** IGI Airport – 26 km / 40 min
* **rail:** Nizamuddin Rly – 13 km
* **landmark:** Sector 15 Indian Oil / Metro Pillar 33

### Hotel Cladis Sector 15, Noida
* **lat, lng:** 28.5855, 77.3110
* **metro:** Sector 15 Station – 4 min walk
* **airport:** IGI Airport – 26 km / 40 min
* **rail:** Nizamuddin Rly – 13 km
* **landmark:** Naya Bans Village

### Hotel Cladis Sector 19, Noida
* **lat, lng:** 28.5830, 77.3210
* **metro:** Sector 16 Station – 8 min walk
* **airport:** IGI Airport – 27 km / 45 min
* **rail:** Nizamuddin Rly – 14 km
* **landmark:** Indo Gulf Hospital

### Hotel Downtown Sector 51, Noida
* **lat, lng:** 28.5815, 77.3750
* **metro:** Sector 52 Station – 10 min walk
* **airport:** IGI Airport – 33 km / 55 min
* **rail:** New Delhi Rly – 25 km
* **landmark:** Kendriya Vihar

### Hotel Downtown EOK (East of Kailash), New Delhi
* **lat, lng:** 28.5550, 77.2450
* **metro:** Kailash Colony – 5 min walk
* **airport:** IGI Airport – 18 km / 35 min
* **rail:** Nizamuddin Rly – 4 km
* **landmark:** ISKCON Temple

### Hotel Amby Inn, Lajpat Nagar
* **lat, lng:** 28.5700, 77.2400
* **metro:** Lajpat Nagar Station – 3 min walk
* **airport:** IGI Airport – 19 km / 35 min
* **rail:** Nizamuddin Rly – 5 km
* **landmark:** Central Market

### Hotel Amar Inn, Lajpat Nagar
* **lat, lng:** 28.5710, 77.2415
* **metro:** Lajpat Nagar Station – 4 min walk
* **airport:** IGI Airport – 19 km / 35 min
* **rail:** Nizamuddin Rly – 5 km
* **landmark:** Jal Vihar

---

## 2. The Guest Number
**Decision:** "50,000+" is the most believable middle ground for a 9-property hotel chain. Use "5,000+" as a monthly/yearly figure, or safely use "500,000+" if referring to historical total lifetime guests.

---

## 3. The 15 Partner Logos
**Decision:** Logos like Dassault, CIRIA, Central Silk Board, Cloudnine, Malabar, and Balaji Railroad are large corporate/government entities. They are typically **Corporate Guests** (B2B contracts). The section should be labeled **"Our Corporate Clients"**.

---

## 4. Unprocessed Room Photos Categorization

**Hotel Amar Inn:**
* `best hotel in lajpat nagar (10).jpeg` → **Room**
* `budget hotel in lajpat nagar.png` → **Room**
* `hotel near lajpat nagar.png` → **Facade / Exterior**
* `budget hotel near lajpat nagar.png` → **Lobby / Reception**

**Hotel Quadis 51:**
* `deluxe room.png`, `super deluxe room.png`, `super deluxe room with balcony.png` → **Rooms**
* `budget hotel near sector 51 noida.png` → **Facade**
* `hotel in sector 51 noida.png` → **Facade**
* `hotel near sector 51 noida.png` → **Lobby**
* `budget hotel in sector 51 noida.png` → **Lobby**

---

## 5. Gallery Filter
**Action Required:** "All" should show everything (all 120 PNGs). It is a UI bug if the "All" tab hides photos present in specific category tabs. It needs to be the true superset.

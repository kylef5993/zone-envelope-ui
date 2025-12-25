import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, 
  Car, 
  Layers, 
  Map as MapIcon, 
  Maximize, 
  Download,
  AlertTriangle,
  Calculator,
  Search,
  MapPin,
  Sun,
  Train,
  Edit3,
  Info,
  Globe,
  Server,
  ArrowRight,
  XCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';

// --- CONFIGURATION ---
const DEFAULT_PROXY_URL = "https://my-zoning-api.onrender.com"; 

// --- GOOGLE MAPS HELPER (FIXED LOADING LOGIC) ---
const GoogleMap = ({ apiKey, address, zoning }) => {
  const mapRef = useRef(null);
  const [mapError, setMapError] = useState(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  // 1. Load the Script safely
  useEffect(() => {
    if (!apiKey) return;
    
    // If already loaded, just set state
    if (window.google && window.google.maps) {
      setIsScriptLoaded(true);
      return;
    }

    // Check if script tag already exists to prevent duplicates
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // If it exists but window.google isn't ready, wait for it
      existingScript.addEventListener('load', () => setIsScriptLoaded(true));
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    // CRITICAL FIX: Wait for load event before letting the app use 'window.google'
    script.onload = () => {
      console.log("Google Maps Script Loaded");
      setIsScriptLoaded(true);
    };
    script.onerror = () => setMapError("Failed to load Google Maps script. Check API Key restrictions.");
    
    document.body.appendChild(script);
  }, [apiKey]);

  // 2. Initialize Map once script is confirmed loaded
  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current || !address) return;

    const initMap = async () => {
       try {
         const geocoder = new window.google.maps.Geocoder();
         geocoder.geocode({ 'address': address + " Chicago, IL" }, (results, status) => {
           if (status === 'OK' && results[0]) {
             const location = results[0].geometry.location;
             
             const map = new window.google.maps.Map(mapRef.current, {
               center: location,
               zoom: 18,
               tilt: 45,
               mapId: 'DEMO_MAP_ID', 
               disableDefaultUI: true,
               zoomControl: true
             });

             const offset = 0.0002;
             const buildingFootprint = [
               { lat: location.lat() + offset, lng: location.lng() - offset },
               { lat: location.lat() + offset, lng: location.lng() + offset },
               { lat: location.lat() - offset, lng: location.lng() + offset },
               { lat: location.lat() - offset, lng: location.lng() - offset },
             ];

             new window.google.maps.Polygon({
               paths: buildingFootprint,
               strokeColor: "#3b82f6",
               strokeOpacity: 0.8,
               strokeWeight: 2,
               fillColor: "#3b82f6",
               fillOpacity: 0.35,
               map: map
             });
             
             new window.google.maps.Marker({
               position: location,
               map: map,
               title: address
             });
           } else {
             console.warn("Geocode failed: " + status);
           }
         });
       } catch (e) {
         console.error("Map Init Error:", e);
         setMapError(e.message);
       }
    };

    initMap();
  }, [isScriptLoaded, address]);

  if (!apiKey) return <div className="flex items-center justify-center h-full bg-slate-100 text-slate-400 text-xs">Enter API Key to load Google Maps</div>;
  if (mapError) return <div className="flex items-center justify-center h-full bg-red-50 text-red-500 text-xs p-4 text-center">{mapError}</div>;

  return <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden bg-slate-200" />;
};

// --- CHICAGO ZONING DATA ---
const CHICAGO_ZONING_DB = {
  // Business & Commercial
  "B1-1": { code: "B1-1", far: 1.2, height: 38, mla: 2500, setbacks: { front: 0, rear: 30, side: 0 }, type: 'commercial' },
  "B1-2": { code: "B1-2", far: 2.2, height: 50, mla: 1000, setbacks: { front: 0, rear: 30, side: 0 }, type: 'commercial' },
  "B1-3": { code: "B1-3", far: 3.0, height: 65, mla: 400, setbacks: { front: 0, rear: 30, side: 0 }, type: 'commercial' },
  "B3-1": { code: "B3-1", far: 1.2, height: 38, mla: 2500, setbacks: { front: 0, rear: 30, side: 0 }, type: 'commercial' },
  "B3-2": { code: "B3-2", far: 2.2, height: 50, mla: 1000, setbacks: { front: 0, rear: 30, side: 0 }, type: 'commercial' },
  "B3-3": { code: "B3-3", far: 3.0, height: 65, mla: 400, setbacks: { front: 0, rear: 30, side: 0 }, type: 'commercial' },
  "B3-5": { code: "B3-5", far: 5.0, height: 80, mla: 200, setbacks: { front: 0, rear: 30, side: 0 }, type: 'commercial' },
  "C1-2": { code: "C1-2", far: 2.2, height: 50, mla: 1000, setbacks: { front: 0, rear: 30, side: 0 }, type: 'commercial' },
  
  // Downtown
  "DX-3": { code: "DX-3", far: 3.0, height: 900, mla: 400, setbacks: { front: 0, rear: 0, side: 0 }, type: 'downtown' },
  "DX-5": { code: "DX-5", far: 5.0, height: 900, mla: 200, setbacks: { front: 0, rear: 0, side: 0 }, type: 'downtown' },
  "DX-7": { code: "DX-7", far: 7.0, height: 900, mla: 145, setbacks: { front: 0, rear: 0, side: 0 }, type: 'downtown' },
  "DX-12": { code: "DX-12", far: 12.0, height: 900, mla: 115, setbacks: { front: 0, rear: 0, side: 0 }, type: 'downtown' },
  "DX-16": { code: "DX-16", far: 16.0, height: 900, mla: 100, setbacks: { front: 0, rear: 0, side: 0 }, type: 'downtown' },
};

const MOCK_ADDRESS_DB = {
  "1000 W RANDOLPH": "DX-5",
  "2500 N MILWAUKEE": "B3-2",
  "4500 N MAGNOLIA": "RS-3",
};

const UNIT_TYPES = {
  studio: { label: 'Studio', size: 450 },
  oneBed: { label: '1 Bed', size: 700 },
  twoBed: { label: '2 Bed', size: 1000 },
};

// --- MOCK GIS MAP COMPONENT ---
const MockGISMap = ({ onParcelClick }) => {
  return (
    <div className="w-full h-full bg-[#e5e5e5] relative overflow-hidden group cursor-crosshair">
      <svg width="100%" height="100%" viewBox="0 0 400 400" className="absolute inset-0">
        <line x1="0" y1="100" x2="400" y2="100" stroke="white" strokeWidth="20" />
        <line x1="0" y1="300" x2="400" y2="300" stroke="white" strokeWidth="15" />
        <line x1="150" y1="0" x2="150" y2="400" stroke="white" strokeWidth="18" />
        <line x1="300" y1="0" x2="300" y2="400" stroke="white" strokeWidth="12" />
        
        <rect x="20" y="20" width="110" height="60" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" className="hover:fill-blue-400 transition-colors cursor-pointer" onClick={() => onParcelClick('B3-2')} />
        <rect x="170" y="20" width="110" height="60" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" className="hover:fill-amber-300 transition-colors cursor-pointer" onClick={() => onParcelClick('C1-2')} />
        
        <rect x="20" y="120" width="110" height="160" fill="#ecfccb" stroke="#84cc16" strokeWidth="2" className="hover:fill-lime-300 transition-colors cursor-pointer" onClick={() => onParcelClick('DX-5')} />
        <text x="75" y="200" fontSize="12" textAnchor="middle" fill="#3f6212" fontWeight="bold">TARGET</text>
        
        <rect x="170" y="120" width="50" height="80" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" className="hover:fill-slate-300 transition-colors" onClick={() => onParcelClick('RS-3')} />
      </svg>
      
      <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded shadow-sm text-[10px] font-mono">
        <div>Lat: 41.8781</div>
        <div>Lng: -87.6298</div>
      </div>
      <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full shadow-sm text-xs font-bold text-indigo-600 flex items-center gap-2">
        <MapIcon size={12} /> Chicago Zoning Layer
      </div>
    </div>
  );
};

// --- ISOMETRIC CANVAS COMPONENT ---
const IsometricCanvas = ({ lot, buildingFloors, parkingFloors, zoning, sunAngle = 45 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    const SCALE = 2.0; 
    const centerX = width / 2;
    const centerY = height * 0.75; 

    const toIso = (x, y, z) => {
      return {
        x: centerX + (x - y) * SCALE,
        y: centerY + (x + y) * 0.5 * SCALE - z * SCALE
      };
    };

    const drawPoly = (points, color, stroke = null) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      if (color) { ctx.fillStyle = color; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    };

    const lotW = lot.width;
    const lotD = lot.depth;
    
    const p1 = toIso(-lotW/2, -lotD/2, 0);
    const p2 = toIso(lotW/2, -lotD/2, 0);
    const p3 = toIso(lotW/2, lotD/2, 0);
    const p4 = toIso(-lotW/2, lotD/2, 0);
    drawPoly([p1, p2, p3, p4], '#e2e8f0', '#94a3b8');

    const bW = Math.max(0, lotW - zoning.setbacks.side * 2);
    const bD = Math.max(0, lotD - zoning.setbacks.front - zoning.setbacks.rear);
    const offX = 0; 
    const offY = (zoning.setbacks.front - zoning.setbacks.rear) / 2;

    const sb1 = toIso(-bW/2 + offX, -bD/2 + offY, 0.5);
    const sb2 = toIso(bW/2 + offX, -bD/2 + offY, 0.5);
    const sb3 = toIso(bW/2 + offX, bD/2 + offY, 0.5);
    const sb4 = toIso(-bW/2 + offX, bD/2 + offY, 0.5);
    
    ctx.setLineDash([5, 5]);
    drawPoly([sb1, sb2, sb3, sb4], null, '#cbd5e1');
    ctx.setLineDash([]);

    let currentZ = 0;
    const stack = [];
    
    parkingFloors.forEach(p => {
      if (!p.isSubt) stack.push({ ...p, color: '#94a3b8', isParking: true });
    });
    
    buildingFloors.forEach(f => {
      let color = '#3b82f6'; // Res
      if (f.type === 'retail') color = '#f59e0b';
      stack.push({ ...f, color, isParking: false });
    });

    stack.forEach((floor, idx) => {
      const flrH = floor.height;
      const maxArea = bW * bD;
      const ratio = Math.sqrt(floor.area / maxArea);
      const flrW = bW * ratio;
      const flrD = bD * ratio;

      const b1 = toIso(-flrW/2 + offX, -flrD/2 + offY, currentZ);
      const b2 = toIso(flrW/2 + offX, -flrD/2 + offY, currentZ);
      const b3 = toIso(flrW/2 + offX, flrD/2 + offY, currentZ);
      const b4 = toIso(-flrW/2 + offX, flrD/2 + offY, currentZ);

      const t1 = toIso(-flrW/2 + offX, -flrD/2 + offY, currentZ + flrH);
      const t2 = toIso(flrW/2 + offX, -flrD/2 + offY, currentZ + flrH);
      const t3 = toIso(flrW/2 + offX, flrD/2 + offY, currentZ + flrH);
      const t4 = toIso(-flrW/2 + offX, flrD/2 + offY, currentZ + flrH);

      const shadowLen = (currentZ + flrH) * 1.5; 
      const rad = (sunAngle * Math.PI) / 180;
      const shX = Math.cos(rad) * shadowLen;
      const shY = Math.sin(rad) * shadowLen;

      const s1 = toIso(-flrW/2 + offX + shX, -flrD/2 + offY + shY, 0);
      const s2 = toIso(flrW/2 + offX + shX, -flrD/2 + offY + shY, 0);
      const s3 = toIso(flrW/2 + offX + shX, flrD/2 + offY + shY, 0);
      const s4 = toIso(-flrW/2 + offX + shX, flrD/2 + offY + shY, 0);

      ctx.globalAlpha = 0.15;
      drawPoly([s1, s2, s3, s4], '#000000');
      ctx.globalAlpha = 1.0;

      drawPoly([b2, b3, t3, t2], shadeColor(floor.color, -20), '#ffffff');
      drawPoly([b3, b4, t4, t3], shadeColor(floor.color, -10), '#ffffff');
      drawPoly([t1, t2, t3, t4], floor.color, '#ffffff');

      currentZ += flrH;
    });

  }, [lot, buildingFloors, parkingFloors, zoning, sunAngle]);

  function shadeColor(color, percent) {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    R = (R<255)?R:255; G = (G<255)?G:255; B = (B<255)?B:255;  
    const RR = ((R.toString(16).length===1)?"0"+R.toString(16):R.toString(16));
    const GG = ((G.toString(16).length===1)?"0"+G.toString(16):G.toString(16));
    const BB = ((B.toString(16).length===1)?"0"+B.toString(16):B.toString(16));
    return "#"+RR+GG+BB;
  }
  return <canvas ref={canvasRef} width={600} height={500} className="w-full h-full object-contain" />;
};

const NavButton = ({ active, id, icon: Icon, label, onClick }) => (
  <button 
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-2 ${
      active === id 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const Card = ({ title, children, className="" }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${className}`}>
    {title && (
      <div className="px-5 py-3 border-b border-slate-100 font-bold text-slate-700 bg-slate-50/50 text-sm uppercase tracking-wide">
        {title}
      </div>
    )}
    <div className="p-5 flex-1">{children}</div>
  </div>
);

const MoneyRow = ({ label, value, isTotal=false, isNegative=false, subtext, highlight }) => {
  const safeValue = typeof value === 'number' ? value : 0;
  return (
    <div className={`flex justify-between items-baseline py-1.5 ${isTotal ? 'border-t border-slate-300 mt-2 pt-2 font-bold text-slate-900' : 'text-slate-600 text-sm'} ${highlight ? 'bg-emerald-50 -mx-2 px-2 rounded' : ''}`}>
      <div>
        {label}
        {subtext && <span className="block text-[10px] text-slate-400 font-normal">{subtext}</span>}
      </div>
      <div className={`font-mono ${isNegative ? 'text-red-600' : ''} ${highlight ? 'text-emerald-700 font-bold' : ''}`}>
        {isNegative ? '(' : ''}${safeValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}{isNegative ? ')' : ''}
      </div>
    </div>
  );
};

const SliderInput = ({ label, value, onChange, min, max, step, unit }) => (
  <div className="mb-4">
    <div className="flex justify-between mb-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <span className="text-xs font-bold text-indigo-600">{value}{unit}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
    />
  </div>
);

const InputField = ({ label, value, onChange, prefix, suffix, step=1 }) => (
  <div className="flex flex-col gap-1 mb-3">
    <label className="text-[10px] uppercase font-bold text-slate-400">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-2 top-1.5 text-slate-500 text-sm">{prefix}</span>}
      <input 
        type="number" 
        step={step}
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-medium focus:outline-none focus:border-indigo-500 ${prefix ? 'pl-5' : ''} ${suffix ? 'pr-8' : ''}`}
      />
      {suffix && <span className="absolute right-2 top-1.5 text-slate-400 text-xs">{suffix}</span>}
    </div>
  </div>
);

export default function App() {
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('visualizer'); 
  const [viewMode, setViewMode] = useState('3d'); 
  
  // 1. Property & Zoning
  const [lot, setLot] = useState({ width: 125, depth: 100 });
  const [zoning, setZoning] = useState({
    code: "C1-2 (Manual)",
    far: 2.2,
    maxHeight: 50,
    setbacks: { front: 0, rear: 30, side: 0 },
    mla: 1000,
    parkingRes: 1.0, 
    parkingRetail: 2.5 
  });
  const [searchAddress, setSearchAddress] = useState("");
  const [googleApiKey, setGoogleApiKey] = useState(""); 
  const [proxyUrl, setProxyUrl] = useState(DEFAULT_PROXY_URL); 
  const [parseStatus, setParseStatus] = useState("idle");
  const [errorDetails, setErrorDetails] = useState(""); // Track specific error messages

  // 2. Program Settings
  const [mix, setMix] = useState({ studio: 20, oneBed: 50, twoBed: 30 }); 
  const [targetRetail, setTargetRetail] = useState(3000); 
  
  // 3. PARKING & TOD SETTINGS
  const [parkingStrategy, setParkingStrategy] = useState('podium'); 
  const [isTOD, setIsTOD] = useState(false); 
  const [manualParkingOverride, setManualParkingOverride] = useState(null);

  // 4. Visualization Settings
  const [sunAngle, setSunAngle] = useState(135); 

  // 5. Financial Assumptions
  const [costs, setCosts] = useState({
    landCost: 3500000,
    hardCostRes: 250,
    hardCostRetail: 200,
    hardCostParking: 90, 
    hardCostSubt: 160,   
    softCostLoad: 0.30 
  });

  const [rents, setRents] = useState({
    rentStudio: 2100,
    rent1Bed: 2800,
    rent2Bed: 3800,
    rentRetail: 45, 
    parkingIncome: 150, 
    vacancyRes: 0.05,
    vacancyRetail: 0.10,
    opexRatio: 0.35 
  });

  // --- ENGINE ---

  const analysis = useMemo(() => {
    const lotArea = lot.width * lot.depth;
    const maxAllowedGSF = lotArea * zoning.far;
    const buildableWidth = Math.max(0, lot.width - (zoning.setbacks.side * 2));
    const buildableDepth = Math.max(0, lot.depth - zoning.setbacks.front - zoning.setbacks.rear);
    const maxFootprint = buildableWidth * buildableDepth;

    const efficiency = 0.85;
    const totalMix = mix.studio + mix.oneBed + mix.twoBed; 
    const normMix = {
      studio: mix.studio / totalMix,
      oneBed: mix.oneBed / totalMix,
      twoBed: mix.twoBed / totalMix
    };
    const avgUnitSize = (UNIT_TYPES.studio.size * normMix.studio) + 
                        (UNIT_TYPES.oneBed.size * normMix.oneBed) + 
                        (UNIT_TYPES.twoBed.size * normMix.twoBed);

    let currentHeight = 0;
    let usedGSF = 0;
    const floors = [];

    if (targetRetail > 0) {
      const retailArea = Math.min(maxFootprint, Math.min(maxAllowedGSF, targetRetail * 1.15));
      floors.push({ type: 'retail', height: 18, area: retailArea, level: 1, units: 0 });
      currentHeight += 18;
      usedGSF += retailArea;
    }

    const remainingHeight = zoning.maxHeight - currentHeight;
    const maxResFloorsByHeight = Math.floor(remainingHeight / 11);
    
    let resFloorsCount = 0;
    const maxUnitsByDensity = Math.floor(lotArea / zoning.mla);
    let currentTotalUnits = 0;

    while (resFloorsCount < maxResFloorsByHeight) {
       if (usedGSF >= maxAllowedGSF) break;
       let floorArea = Math.min(maxFootprint, maxAllowedGSF - usedGSF);
       if (floorArea < 1500) break; 
       let unitsOnFloor = Math.floor((floorArea * efficiency) / avgUnitSize);
       if (currentTotalUnits + unitsOnFloor > maxUnitsByDensity) {
         unitsOnFloor = Math.max(0, maxUnitsByDensity - currentTotalUnits);
         if (unitsOnFloor === 0) break;
       }
       floors.push({ type: 'residential', height: 11, area: floorArea, level: floors.length + 1, units: unitsOnFloor });
       usedGSF += floorArea;
       currentHeight += 11;
       currentTotalUnits += unitsOnFloor;
       resFloorsCount++;
    }

    const totalUnits = floors.reduce((acc, f) => acc + f.units, 0);
    let reqResSpots = Math.ceil(totalUnits * zoning.parkingRes);
    if (isTOD) reqResSpots = 0; 

    const reqRetailSpots = Math.ceil((targetRetail/1000) * zoning.parkingRetail);
    let requiredTotal = reqResSpots + reqRetailSpots;
    let finalParkingCount = manualParkingOverride !== null ? manualParkingOverride : requiredTotal;
    
    const parkingAreaNeeded = finalParkingCount * 350; 
    const parkingFootprint = lotArea * 0.90; 
    const parkingLevels = Math.ceil(parkingAreaNeeded / parkingFootprint);
    
    const parkingFloors = [];
    for(let p=0; p<parkingLevels; p++){
       parkingFloors.push({
         type: 'parking',
         height: 10,
         area: Math.min(parkingAreaNeeded - (p*parkingFootprint), parkingFootprint),
         isSubt: parkingStrategy === 'underground'
       });
    }

    const grossRentRes = (
      (totalUnits * normMix.studio * rents.rentStudio) +
      (totalUnits * normMix.oneBed * rents.rent1Bed) +
      (totalUnits * normMix.twoBed * rents.rent2Bed)
    ) * 12;
    
    const grossRentRetail = (floors.find(f=>f.type==='retail')?.area || 0) * efficiency * rents.rentRetail;
    const grossParking = finalParkingCount * rents.parkingIncome * 12;
    
    const gpr = grossRentRes + grossRentRetail + grossParking;
    const vacancy = (grossRentRes * rents.vacancyRes) + (grossRentRetail * rents.vacancyRetail);
    const egi = gpr - vacancy;
    const opex = egi * rents.opexRatio;
    const noi = egi - opex;

    const buildCostRes = floors.filter(f=>f.type==='residential').reduce((acc,f) => acc + (f.area * costs.hardCostRes), 0);
    const buildCostRetail = floors.filter(f=>f.type==='retail').reduce((acc,f) => acc + (f.area * costs.hardCostRetail), 0);
    const buildCostParking = parkingFloors.reduce((acc,f) => acc + (f.area * (f.isSubt ? costs.hardCostSubt : costs.hardCostParking)), 0);
    
    const totalHard = buildCostRes + buildCostRetail + buildCostParking;
    const totalSoft = totalHard * costs.softCostLoad;
    const totalProjectCost = costs.landCost + totalHard + totalSoft;
    
    const yieldOnCost = totalProjectCost > 0 ? noi / totalProjectCost : 0;

    const parkingRevenue = grossParking;
    const parkingOpEx = parkingRevenue * rents.opexRatio; 
    const parkingNOI = parkingRevenue - parkingOpEx;
    const parkingYield = buildCostParking > 0 ? parkingNOI / buildCostParking : 0;

    return {
      lotArea, maxAllowedGSF, usedGSF, currentHeight,
      floors, parkingFloors, totalUnits, 
      parkingStats: { required: requiredTotal, provided: finalParkingCount, yield: parkingYield },
      financials: {
        grossRentRes, grossRentRetail, grossParking, 
        gpr, vacancy, egi, opex, noi,
        totalProjectCost, yieldOnCost
      },
      constraints: {
        hitHeight: currentHeight + 11 > zoning.maxHeight,
        hitFAR: usedGSF >= maxAllowedGSF * 0.98,
        hitDensity: currentTotalUnits >= maxUnitsByDensity
      }
    };
  }, [lot, zoning, mix, targetRetail, parkingStrategy, costs, rents, isTOD, manualParkingOverride]);

  const handleAddressSearch = async () => {
    setParseStatus("processing");
    setErrorDetails(""); 
    const term = searchAddress.toUpperCase().trim();
    
    // 1. Try Live Proxy
    if (proxyUrl && proxyUrl.length > 5) {
      try {
        const endpoint = proxyUrl.endsWith('/api/zoning') ? proxyUrl : `${proxyUrl}/api/zoning`;
        const response = await fetch(`${endpoint}?address=${encodeURIComponent(term)}`);
        const data = await response.json();
        
        if (data.success) {
           const rawCode = data.zone_class; 
           const dbKey = Object.keys(CHICAGO_ZONING_DB).find(k => k.replace("-","") === rawCode.replace("-",""));
           const zoneDetails = dbKey ? CHICAGO_ZONING_DB[dbKey] : null;

           setZoning(prev => ({
              ...prev,
              code: `Chicago ${rawCode}`, 
              far: zoneDetails ? zoneDetails.far : (parseFloat(data.far) || 2.0), 
              maxHeight: zoneDetails ? zoneDetails.height : 50,
              setbacks: zoneDetails ? zoneDetails.setbacks : { front: 0, rear: 30, side: 0 },
              mla: zoneDetails ? zoneDetails.mla : 1000
           }));
           
           setParseStatus("success");
           setTimeout(() => { setActiveTab('visualizer'); setParseStatus("idle"); }, 800);
           return;
        } else {
          console.warn("Proxy returned failure:", data.message);
          setErrorDetails(data.message || "Address found, but no zoning data available.");
          setParseStatus("error");
          // DO NOT FALLBACK TO SIMULATION if we know it failed
          return;
        }
      } catch (err) {
        console.error("Proxy Error:", err);
        setErrorDetails("Connection to Render Backend failed. Check if server is running.");
        setParseStatus("error");
        return;
      }
    }

    // 2. Only use simulation if NO proxy URL is provided
    setTimeout(() => {
      let foundZoneKey = null;
      const matchedAddress = Object.keys(MOCK_ADDRESS_DB).find(addr => term.includes(addr));
      if (matchedAddress) {
        foundZoneKey = MOCK_ADDRESS_DB[matchedAddress];
      } else {
        foundZoneKey = Object.keys(CHICAGO_ZONING_DB).find(k => term.includes(k) || term.includes(k.replace("-", "")));
      }
      if (foundZoneKey && CHICAGO_ZONING_DB[foundZoneKey]) {
        const zone = CHICAGO_ZONING_DB[foundZoneKey];
        setZoning(prev => ({
          ...prev,
          code: `Chicago ${zone.code}`,
          far: zone.far,
          maxHeight: zone.height,
          setbacks: zone.setbacks,
          mla: zone.mla
        }));
        setParseStatus("success");
        setTimeout(() => { setActiveTab('visualizer'); setParseStatus("idle"); }, 800);
      } else {
        setZoning(prev => ({ ...prev, code: "Simulated C1-2", far: 2.2, maxHeight: 50, setbacks: { front: 0, rear: 30, side: 0 }, mla: 1000 }));
        setParseStatus("simulated");
        setTimeout(() => { setActiveTab('visualizer'); setParseStatus("idle"); }, 1500);
      }
    }, 1500);
  };

  const handleMapClick = (zoneCode) => {
    const zone = CHICAGO_ZONING_DB[zoneCode];
    if(zone) {
      setZoning({
         code: `Chicago ${zone.code}`,
         far: zone.far,
         maxHeight: zone.height,
         setbacks: zone.setbacks,
         mla: zone.mla || 1000,
         parkingRes: 1.0,
         parkingRetail: 2.5
      });
      setSearchAddress(`Map Selection: ${zoneCode}`);
      setParseStatus("success");
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4 shrink-0">
        <div className="flex items-center gap-2 mb-8 px-2 text-white">
          <div className="bg-indigo-600 p-2 rounded-lg"><Layers size={20} /></div>
          <div>
            <h1 className="font-bold text-lg leading-none">ZoneEnvelope</h1>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">3D Edition</span>
          </div>
        </div>

        <NavButton id="visualizer" icon={Maximize} label="Massing & 3D" active={activeTab} onClick={setActiveTab} />
        <NavButton id="financials" icon={Calculator} label="Financial Model" active={activeTab} onClick={setActiveTab} />
        <NavButton id="zoning" icon={MapIcon} label="GIS / Zoning" active={activeTab} onClick={setActiveTab} />
        
        <div className="mt-auto">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Yield on Cost</div>
            <div className={`text-2xl font-mono font-bold ${analysis.financials.yieldOnCost > 0.06 ? 'text-emerald-400' : 'text-amber-500'}`}>
              {(analysis.financials.yieldOnCost * 100).toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-2 flex justify-between">
              <span>Cost: ${(analysis.financials.totalProjectCost/1000000).toFixed(1)}M</span>
              <span>NOI: ${(analysis.financials.noi/1000).toFixed(0)}k</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
        
        {/* HEADER */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
             <span className="font-bold text-slate-700">{activeTab === 'visualizer' ? '3D Massing Studio' : activeTab === 'financials' ? 'Operating Pro Forma' : 'Zoning & GIS'}</span>
             <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500 font-mono border border-slate-200">{zoning.code}</span>
          </div>
          <div className="flex items-center gap-3">
             {activeTab === 'visualizer' && (
               <div className="flex bg-slate-100 p-1 rounded-lg">
                 <button onClick={() => setViewMode('3d')} className={`px-3 py-1 text-xs font-medium rounded ${viewMode === '3d' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>3D</button>
                 <button onClick={() => setViewMode('section')} className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'section' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Section</button>
                 <button onClick={() => setViewMode('plan')} className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'plan' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Plan</button>
               </div>
             )}
             <button className="p-2 text-slate-400 hover:text-indigo-600"><Download size={20} /></button>
          </div>
        </div>

        {/* VISUALIZER TAB */}
        {activeTab === 'visualizer' && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* CONTROLS */}
            <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto p-5 space-y-6">
              
              {/* STATUS BADGES */}
              <div className="flex flex-wrap gap-2">
                 {analysis.constraints.hitHeight && <div className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded flex items-center gap-1"><AlertTriangle size={10} /> Max Height</div>}
                 {analysis.constraints.hitFAR && <div className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded flex items-center gap-1"><AlertTriangle size={10} /> Max FAR</div>}
              </div>

              {/* MASSING CONTROLS */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Building2 size={12}/> Massing</h3>
                <SliderInput label="Studio %" value={mix.studio} min={0} max={100} step={5} unit="%" onChange={(v) => setMix({...mix, studio: v})} />
                <SliderInput label="1 Bed %" value={mix.oneBed} min={0} max={100} step={5} unit="%" onChange={(v) => setMix({...mix, oneBed: v})} />
                <SliderInput label="2 Bed %" value={mix.twoBed} min={0} max={100} step={5} unit="%" onChange={(v) => setMix({...mix, twoBed: v})} />
              </div>

              {/* PARKING & TOD */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Car size={12}/> Parking Strategy</h3>
                
                {/* TOD Toggle */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${isTOD ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <Train size={14} />
                    </div>
                    <div className="text-xs font-medium text-slate-700">Transit Served (TOD)</div>
                  </div>
                  <button 
                    onClick={() => setIsTOD(!isTOD)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${isTOD ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${isTOD ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                {/* Manual Override Input */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Spaces Provided</span>
                    <span className="font-bold text-slate-700">{analysis.parkingStats.provided}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="number" 
                      className="w-full p-2 text-sm border border-slate-300 rounded"
                      placeholder={`Req: ${analysis.parkingStats.required}`}
                      value={manualParkingOverride ?? ''}
                      onChange={(e) => setManualParkingOverride(e.target.value === '' ? null : parseInt(e.target.value))}
                    />
                    <button 
                      onClick={() => setManualParkingOverride(null)}
                      className="p-2 text-slate-400 hover:text-red-500"
                      title="Reset to Formula"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {manualParkingOverride !== null ? "Manual override active" : "Auto-calculated based on zoning"}
                  </div>
                </div>

                {/* Strategy Toggles */}
                <div className="flex p-1 bg-white rounded border border-slate-200">
                  <button onClick={()=>setParkingStrategy('podium')} className={`flex-1 py-1 text-xs rounded ${parkingStrategy === 'podium' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>Podium</button>
                  <button onClick={()=>setParkingStrategy('underground')} className={`flex-1 py-1 text-xs rounded ${parkingStrategy === 'underground' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>Underground</button>
                </div>
              </div>

              {/* 3D CONTROLS */}
              {viewMode === '3d' && (
                <div>
                   <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Sun size={12}/> Solar Study</h3>
                   <SliderInput label="Sun Angle" value={sunAngle} min={0} max={360} step={5} unit="°" onChange={setSunAngle} />
                </div>
              )}

            </div>

            {/* CANVAS AREA */}
            <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center p-10">
               
               {viewMode === '3d' && (
                 <div className="w-full h-full relative">
                   <IsometricCanvas 
                      lot={lot} 
                      buildingFloors={analysis.floors} 
                      parkingFloors={analysis.parkingFloors}
                      zoning={zoning}
                      sunAngle={sunAngle}
                   />
                   <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded text-[10px] text-slate-500 shadow backdrop-blur">
                     <div className="font-bold text-slate-700 mb-1">Massing Visualization</div>
                     Drag "Sun Angle" to simulate daylight shadows
                   </div>
                 </div>
               )}

               {viewMode === 'section' && (
                 <div className="relative w-full max-w-lg flex flex-col-reverse items-center">
                    <div className="w-[150%] h-1 bg-slate-800 z-20"></div>
                    {/* Underground Parking */}
                    {parkingStrategy === 'underground' && (
                       <div className="w-64 flex flex-col opacity-60 translate-y-[100%] absolute bottom-0">
                          {analysis.parkingFloors.map((f, i) => (
                             <div key={i} className="w-full h-8 bg-slate-400 border-b border-slate-500 border-dashed flex items-center justify-center text-[10px] text-white">P{i+1}</div>
                          ))}
                       </div>
                    )}
                    {/* Above Grade Stack */}
                    <div className="flex flex-col-reverse w-64 relative z-10 shadow-2xl">
                       {/* Podium Parking */}
                       {parkingStrategy === 'podium' && analysis.parkingFloors.map((f,i) => (
                          <div key={i} className="w-full h-8 bg-slate-500 border-b border-white/20 flex items-center px-2 text-[10px] text-white font-bold gap-2">
                             <Car size={12} /> P{i+1}
                          </div>
                       ))}
                       {/* Res/Retail */}
                       {analysis.floors.map((f, i) => (
                          <div 
                            key={i} 
                            className="w-full border-b border-white/20 relative group transition-all hover:scale-[1.05] cursor-pointer"
                            style={{ 
                              height: `${f.height * 3}px`,
                              backgroundColor: f.type === 'retail' ? '#f59e0b' : '#3b82f6' // Amber for retail, Blue for res
                            }}
                          >
                             <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white text-[10px] font-bold">
                               {f.type === 'retail' ? 'RETAIL' : `L${f.level}`}
                             </div>
                             <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 text-[10px]">
                               {f.type === 'residential' ? `${f.units} units` : `${Math.round(f.area)} sf`}
                             </div>
                          </div>
                       ))}
                    </div>
                    {/* Height Limit */}
                    <div className="absolute w-full border-t-2 border-dashed border-red-400 flex items-center justify-end text-xs text-red-500 font-bold z-0" style={{bottom: `${zoning.maxHeight * 3}px`}}>
                       <span className="bg-slate-100 px-1">MAX HEIGHT {zoning.maxHeight}'</span>
                    </div>
                 </div>
               )}

               {viewMode === 'plan' && (
                 <div className="bg-white border-2 border-slate-800 shadow-xl relative" style={{ width: '400px', aspectRatio: `${lot.width}/${lot.depth}` }}>
                    <div className="absolute top-2 left-2 text-[10px] text-slate-400 font-mono">LOT LINE</div>
                    <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 font-mono">{lot.width}' x {lot.depth}'</div>
                    <div className="absolute bg-indigo-500/10 border-2 border-indigo-500 border-dashed flex items-center justify-center"
                       style={{
                         top: `${(zoning.setbacks.rear / lot.depth)*100}%`,
                         bottom: `${(zoning.setbacks.front / lot.depth)*100}%`,
                         left: `${(zoning.setbacks.side / lot.width)*100}%`,
                         right: `${(zoning.setbacks.side / lot.width)*100}%`,
                       }}
                    >
                       <div className="text-center">
                          <div className="text-indigo-600 font-bold text-sm">BUILDABLE</div>
                          <div className="text-indigo-400 text-[10px]">{Math.round(analysis.floors[1]?.area || 0).toLocaleString()} sf plate</div>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* FINANCIALS TAB */}
        {activeTab === 'financials' && (
          <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
               <Card title="Revenue Assumptions">
                  <div className="space-y-4">
                     <InputField label="Studio Rent" prefix="$" value={rents.rentStudio} onChange={(v)=>setRents({...rents, rentStudio: v})} />
                     <InputField label="1 Bed Rent" prefix="$" value={rents.rent1Bed} onChange={(v)=>setRents({...rents, rent1Bed: v})} />
                     <InputField label="2 Bed Rent" prefix="$" value={rents.rent2Bed} onChange={(v)=>setRents({...rents, rent2Bed: v})} />
                     <InputField label="Retail Rent /sf/yr" prefix="$" value={rents.rentRetail} onChange={(v)=>setRents({...rents, rentRetail: v})} />
                     <div className="pt-2 border-t border-slate-100">
                        <InputField label="Res Vacancy %" suffix="%" value={rents.vacancyRes*100} step={0.5} onChange={(v)=>setRents({...rents, vacancyRes: v/100})} />
                     </div>
                     <div className="pt-2 border-t border-slate-100">
                        <InputField label="Parking Income/Spot" prefix="$" value={rents.parkingIncome} onChange={(v)=>setRents({...rents, parkingIncome: v})} />
                     </div>
                  </div>
               </Card>
               <Card title="Cost Assumptions">
                  <div className="space-y-4">
                     <InputField label="Land Purchase" prefix="$" value={costs.landCost} onChange={(v)=>setCosts({...costs, landCost: v})} />
                     <InputField label="Res Hard Cost /sf" prefix="$" value={costs.hardCostRes} onChange={(v)=>setCosts({...costs, hardCostRes: v})} />
                     <div className="pt-2 border-t border-slate-100">
                       <InputField label="Podium Parking /sf" prefix="$" value={costs.hardCostParking} onChange={(v)=>setCosts({...costs, hardCostParking: v})} />
                       <InputField label="Underground Parking /sf" prefix="$" value={costs.hardCostSubt} onChange={(v)=>setCosts({...costs, hardCostSubt: v})} />
                     </div>
                  </div>
               </Card>
            </div>
            <div className="lg:col-span-8">
               <Card title="Stabilized Pro Forma" className="h-full">
                  <div className="p-4 space-y-6">
                     <div>
                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Gross Potential Revenue</h4>
                        <MoneyRow label={`Residential (${analysis.totalUnits} Units)`} value={analysis.financials.grossRentRes} />
                        <MoneyRow label="Commercial / Retail" value={analysis.financials.grossRentRetail} />
                        <MoneyRow label={`Parking (${analysis.parkingStats.provided} spaces)`} value={analysis.financials.grossParking} />
                        <MoneyRow label="Total GPR" value={analysis.financials.gpr} isTotal />
                        <div className="my-2"></div>
                        <MoneyRow label="Vacancy Loss" value={analysis.financials.vacancy} isNegative />
                        <div className="bg-indigo-50 p-3 rounded mt-2">
                           <MoneyRow label="Effective Gross Income (EGI)" value={analysis.financials.egi} isTotal />
                        </div>
                     </div>
                     <div>
                        <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Operating Expenses</h4>
                        <MoneyRow label="Taxes, Ins, Mgmt, Maint" value={analysis.financials.opex} subtext={`modeled at ${rents.opexRatio*100}% of EGI`} />
                        <div className="bg-amber-50 p-3 rounded mt-2">
                           <MoneyRow label="Net Operating Income (NOI)" value={analysis.financials.noi} isTotal />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                           <div className="text-[10px] text-slate-400 uppercase font-bold mb-2">Parking Yield Analysis</div>
                           <div className="text-xs text-slate-600 mb-1 flex justify-between">
                             <span>Yield on Parking Cost:</span>
                             <span className={`font-bold ${analysis.parkingStats.yield > analysis.financials.yieldOnCost ? 'text-emerald-600' : 'text-slate-700'}`}>{(analysis.parkingStats.yield * 100).toFixed(2)}%</span>
                           </div>
                           <div className="text-[10px] text-slate-400 italic">
                             {analysis.parkingStats.yield > analysis.financials.yieldOnCost 
                               ? "Parking is currently boosting total yield." 
                               : "Parking is currently diluting total yield."}
                           </div>
                        </div>
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                           <div className="text-[10px] text-emerald-600 uppercase font-bold">Total Yield on Cost</div>
                           <div className="text-xl font-bold text-emerald-600">{(analysis.financials.yieldOnCost*100).toFixed(2)}%</div>
                        </div>
                     </div>
                  </div>
               </Card>
            </div>
          </div>
        )}

        {/* ZONING TAB (GIS SIMULATION) */}
        {activeTab === 'zoning' && (
           <div className="flex-1 p-8 flex flex-col items-center justify-center">
              <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                 
                 {/* LEFT: ADDRESS SEARCH */}
                 <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><MapPin size={24} /></div>
                       <div>
                          <h2 className="text-xl font-bold text-slate-900">Address Zoning Lookup</h2>
                          <p className="text-sm text-slate-500">Integration with Chicago GIS.</p>
                       </div>
                    </div>
                    
                    <div className="space-y-4 mb-8">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Property Address</label>
                        <div className="relative mt-1">
                          <input 
                             type="text"
                             className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                             placeholder="e.g. 1000 W Randolph St"
                             value={searchAddress}
                             onChange={(e)=>setSearchAddress(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                          />
                          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                            Google Maps API Key <Info size={12} />
                          </label>
                          <input 
                             type="password"
                             className="w-full px-4 py-2 mt-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                             placeholder="Paste key..."
                             value={googleApiKey}
                             onChange={(e)=>setGoogleApiKey(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                            Render Proxy URL <Server size={12} />
                          </label>
                          <input 
                             type="text"
                             className="w-full px-4 py-2 mt-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                             placeholder="https://your-app.onrender.com"
                             value={proxyUrl}
                             onChange={(e)=>setProxyUrl(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 italic">
                          API Key required for live map. Proxy URL required for live zoning data.
                      </div>
                    </div>

                    <button 
                       onClick={handleAddressSearch}
                       disabled={parseStatus === 'processing' || !searchAddress}
                       className={`w-full py-4 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${parseStatus === 'processing' || !searchAddress ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}
                    >
                       {parseStatus === 'processing' ? 'Searching GIS...' : parseStatus === 'success' ? 'Zoning Found!' : parseStatus === 'simulated' ? 'Zoning Simulated' : parseStatus === 'error' ? 'Failed - Retry' : 'Find Zoning'} 
                       {parseStatus === 'idle' && <ArrowRight />}
                    </button>
                    
                    {parseStatus === 'error' && (
                        <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex gap-2">
                            <XCircle size={16} />
                            <div>
                                <strong>Error:</strong> {errorDetails || "Could not fetch zoning data."}
                            </div>
                        </div>
                    )}

                    {parseStatus === 'simulated' && (
                      <div className="mt-4 p-3 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200 flex gap-2">
                        <AlertTriangle size={16} />
                        <span><strong>Simulation Mode:</strong> Backend connection failed, using dummy data.</span>
                      </div>
                    )}
                    
                    <div className="mt-auto pt-6 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold mb-2">
                        <Globe size={14} /> Live Data Connection
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Connect to the City of Chicago Data Portal via your Render proxy to get real-time zoning for any parcel.
                      </p>
                    </div>
                 </div>

                 {/* RIGHT: INTERACTIVE MAP */}
                 <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative shadow-lg">
                    {googleApiKey ? (
                      <GoogleMap apiKey={googleApiKey} address={searchAddress} zoning={zoning} />
                    ) : (
                      <MockGISMap onParcelClick={(code) => {
                        setSearchAddress(`Selected Parcel (${code})`);
                        // Trigger mock find
                        const zone = CHICAGO_ZONING_DB[code];
                        if(zone) {
                          setZoning({ ...zoning, code: `Chicago ${zone.code}`, far: zone.far, maxHeight: zone.height, setbacks: zone.setbacks, mla: zone.mla });
                          setParseStatus("success");
                        }
                      }} />
                    )}
                 </div>

              </div>
           </div>
        )}

      </div>
    </div>
  );
}
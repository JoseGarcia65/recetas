import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, BookOpen, Calendar, Plus, Save, Trash2, Edit2, 
  ChefHat, Clock, X, UtensilsCrossed, Wifi, WifiOff, 
  AlertCircle, Settings, Download, Upload, Copy, CheckCircle2, 
  Image as ImageIcon, Languages, Globe, Database, User, Eye, 
  RefreshCw, ShieldAlert
} from 'lucide-react';

// Importamos la configuración desde nuestro archivo local firebase.js
import { auth, db, appId } from './firebase'; 
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, setDoc, writeBatch, 
  enableIndexedDbPersistence 
} from 'firebase/firestore';

// Intentar habilitar persistencia offline
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Múltiples pestañas abiertas
    } else if (err.code === 'unimplemented') {
        // El navegador no soporta esto
    }
  });
} catch (e) { console.warn(e); }

// --- DATABASE MOCK (Español) ---
const MOCK_DB_ES = [
  { 
    title: "Pollo al Curry con Arroz", 
    ingredients: ["pollo", "curry", "arroz", "cebolla", "leche de coco"], 
    time: "30 min", 
    difficulty: "Fácil",
    image: "https://www.themealdb.com/images/media/meals/vwrpps1503068729.jpg"
  },
  { 
    title: "Ensalada César", 
    ingredients: ["lechuga", "pollo", "pan", "queso parmesano", "salsa césar"], 
    time: "15 min", 
    difficulty: "Fácil",
    image: "https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg"
  },
  { title: "Pasta Carbonara Original", ingredients: ["pasta", "huevo", "queso", "guanciale"], time: "20 min", difficulty: "Media", image: "https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg" },
  { title: "Tortilla de Patatas", ingredients: ["huevo", "patata", "cebolla", "aceite"], time: "40 min", difficulty: "Media", image: "https://www.themealdb.com/images/media/meals/yqwtvu1483387116.jpg" },
  { title: "Salmón al Horno", ingredients: ["salmón", "limón", "eneldo", "aceite"], time: "25 min", difficulty: "Fácil", image: "https://www.themealdb.com/images/media/meals/1549542994.jpg" }
];

const generateInstructions = (title) => `Paso 1: Preparar ingredientes para ${title}.\nPaso 2: Cocinar a fuego medio.\nPaso 3: Servir caliente.`;

// --- HELPERS ---
const toBase64 = (str) => { try { return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1))); } catch (e) { return ""; } };
const fromBase64 = (str) => { try { return decodeURIComponent(atob(str).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')); } catch (e) { return null; } };

// --- CACHE LOCAL STORAGE MANAGER ---
const loadCachedData = (key) => {
  try {
    const cached = localStorage.getItem(`chef_app_${key}`);
    return cached ? JSON.parse(cached) : [];
  } catch (e) { return []; }
};

const saveToCache = (key, data) => {
  try { localStorage.setItem(`chef_app_${key}`, JSON.stringify(data)); } catch (e) {}
};

// --- COMPONENTES ---
const RecipeCard = ({ recipe, onSave, onEdit, onDelete, isSaved, onView, isOffline }) => {
  const handleTranslate = (e) => {
    e.stopPropagation();
    const text = encodeURIComponent(recipe.instructions);
    window.open(`https://translate.google.com/?sl=en&tl=es&text=${text}&op=translate`, '_blank');
  };

  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border flex flex-col h-full group ${isSaved ? 'border-emerald-200 ring-1 ring-emerald-50' : 'border-gray-100'}`}>
      <div className="h-40 bg-gray-100 relative overflow-hidden cursor-pointer" onClick={() => onView(recipe)}>
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={(e) => e.target.style.display = 'none'} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-200"><ChefHat size={48} /></div>
        )}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm flex items-center gap-1"><Clock size={10} /> {recipe.time || '30 min'}</div>
        {recipe.source === 'Internet' && <div className="absolute top-2 left-2 bg-blue-500/90 backdrop-blur px-2 py-1 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1"><Globe size={10} /> Inglés</div>}
        {recipe.source === 'Mío' && <div className="absolute top-2 left-2 bg-emerald-500/90 backdrop-blur px-2 py-1 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1"><User size={10} /> Mía</div>}
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-800 text-lg mb-1 leading-tight cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => onView(recipe)}>{recipe.title}</h3>
        <p className="text-xs text-gray-500 mb-2 flex-1 line-clamp-3"><span className="font-semibold text-gray-700">Ingredientes:</span> {Array.isArray(recipe.ingredients) ? recipe.ingredients.join(", ") : recipe.ingredients}</p>
        <button onClick={() => onView(recipe)} className="text-xs text-emerald-600 font-semibold hover:underline mb-4 flex items-center gap-1 self-start"><Eye size={12} /> Ver completa</button>
        {!isSaved && recipe.source === 'Internet' && <button onClick={handleTranslate} className="mb-3 text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:underline"><Languages size={12} /> Traducir</button>}
        
        <div className="mt-auto flex gap-2">
          {isSaved ? (
            <>
              <button disabled={isOffline} onClick={(e) => { e.stopPropagation(); onEdit(recipe); }} className="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-lg hover:bg-emerald-100 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"><Edit2 size={14} /> Editar</button>
              <button disabled={isOffline} onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"><Trash2 size={16} /></button>
            </>
          ) : (
            <button disabled={isOffline} onClick={(e) => { e.stopPropagation(); onSave(recipe); }} className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 text-sm font-medium shadow-sm disabled:opacity-50"><Save size={16} /> Guardar</button>
          )}
        </div>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto transform transition-all scale-100">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800 line-clamp-1">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition"><X size={24} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('saved'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState('local'); 
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Inicializar con caché local para evitar pantalla blanca si Firebase falla
  const [savedRecipes, setSavedRecipes] = useState(() => loadCachedData('recipes'));
  const [mealPlan, setMealPlan] = useState(() => loadCachedData('mealplan'));
  
  const [dataError, setDataError] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null); 
  const [viewingRecipe, setViewingRecipe] = useState(null); 
  const [isCreating, setIsCreating] = useState(false); 
  const [calendarModal, setCalendarModal] = useState({ isOpen: false, date: null, type: null });
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [backupString, setBackupString] = useState('');
  const [importString, setImportString] = useState('');
  const [importStatus, setImportStatus] = useState(null);
  const [copyStatus, setCopyStatus] = useState(false);

  // --- AUTH & INIT ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        // En la versión standalone usamos auth anónimo por defecto
        await signInAnonymously(auth);
      } catch (err) {
        console.warn("Auth falló, activando modo offline:", err);
        setIsOfflineMode(true);
        setDataError("Modo Sin Conexión (Datos locales)");
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
         setIsOfflineMode(false);
         setDataError(null);
      } else {
         setIsOfflineMode(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- DATA SYNC ---
  useEffect(() => {
    if (!user && !isOfflineMode) return;
    if (isOfflineMode) return; 

    // Referencias usando appId importado
    const recipesRef = collection(db, 'artifacts', appId, 'public', 'data', 'recipes');
    const mealPlanRef = collection(db, 'artifacts', appId, 'public', 'data', 'meal_plan');

    const unsubRecipes = onSnapshot(query(recipesRef, orderBy('createdAt', 'desc')), 
      (snapshot) => {
        const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSavedRecipes(recipes);
        saveToCache('recipes', recipes);
        setDataError(null);
      }, 
      (err) => {
        console.error("Firestore Error:", err);
        setIsOfflineMode(true);
        setDataError("Servidor saturado o sin conexión. Usando copia local.");
      }
    );

    const unsubMealPlan = onSnapshot(mealPlanRef, 
      (snapshot) => {
        const plan = {};
        snapshot.docs.forEach(doc => { plan[doc.id] = doc.data(); });
        setMealPlan(plan);
        saveToCache('mealplan', plan);
      }, 
      (err) => console.error("Firestore Error (Plan):", err)
    );

    return () => { unsubRecipes(); unsubMealPlan(); };
  }, [user, isOfflineMode]);

  // --- BACKUP STRING GENERATION ---
  useEffect(() => {
    if (backupModalOpen) {
      const data = { recipes: savedRecipes, mealPlan: mealPlan, generatedAt: new Date().toISOString(), version: 1 };
      setBackupString(toBase64(JSON.stringify(data)));
    }
  }, [backupModalOpen, savedRecipes, mealPlan]);

  // --- ACTIONS ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    setTimeout(async () => {
      try {
        if (searchSource === 'local') {
          const terms = searchQuery.toLowerCase().split(',').map(t => t.trim()).filter(t => t);
          const myResults = savedRecipes.filter(recipe => {
             const ingString = Array.isArray(recipe.ingredients) ? recipe.ingredients.join(' ').toLowerCase() : recipe.ingredients.toLowerCase();
             return terms.some(term => ingString.includes(term) || recipe.title.toLowerCase().includes(term));
          }).map(r => ({ ...r, source: 'Mío' }));

          let mockResults = MOCK_DB_ES.filter(recipe => {
            return terms.some(term => recipe.ingredients.some(ing => ing.toLowerCase().includes(term)) || recipe.title.toLowerCase().includes(term));
          });
          mockResults = mockResults.filter(mock => !myResults.some(saved => saved.title === mock.title));
          
          if ((myResults.length + mockResults.length) < 5) {
             const remaining = MOCK_DB_ES.filter(r => !mockResults.includes(r) && !myResults.some(saved => saved.title === r.title));
             mockResults = [...mockResults, ...remaining.slice(0, 5 - (myResults.length + mockResults.length))];
          }
          const formattedMockResults = mockResults.map((r, i) => ({
             ...r, tempId: `local-${Date.now()}-${i}`, instructions: r.instructions || generateInstructions(r.title), source: 'Base de Datos'
          }));
          setSearchResults([...myResults, ...formattedMockResults]);
        } else {
          if (isOfflineMode) { alert("Búsqueda en internet no disponible en modo offline."); setIsSearching(false); return; }
          const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${searchQuery}`);
          const data = await response.json();
          if (data.meals) {
            setSearchResults(data.meals.map((meal) => {
                const ingredients = [];
                for (let i = 1; i <= 20; i++) if (meal[`strIngredient${i}`]) ingredients.push(meal[`strIngredient${i}`]);
                return {
                    tempId: meal.idMeal, title: meal.strMeal, image: meal.strThumb, ingredients: ingredients,
                    instructions: meal.strInstructions, time: "45 min", difficulty: ingredients.length > 8 ? "Difícil" : "Media", source: 'Internet'
                };
            }));
          } else { setSearchResults([]); }
        }
      } catch (error) { console.error(error); alert("Error en la búsqueda."); } finally { setIsSearching(false); }
    }, 600);
  };

  const handleSaveOrUpdate = async (e) => {
    e.preventDefault();
    if (isOfflineMode) { alert("No se pueden guardar cambios en modo offline."); return; }
    if (!user || !editingRecipe) return;

    try {
      const recipeData = {
        title: editingRecipe.title,
        ingredients: Array.isArray(editingRecipe.ingredients) ? editingRecipe.ingredients : editingRecipe.ingredients.split(',').map(s => s.trim()),
        instructions: editingRecipe.instructions,
        time: editingRecipe.time,
        difficulty: editingRecipe.difficulty,
        image: editingRecipe.image || '',
        createdAt: new Date().toISOString()
      };
      if (isCreating) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'recipes'), recipeData);
      else await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'recipes', editingRecipe.id), recipeData);
      setEditingRecipe(null); setIsCreating(false);
    } catch (err) { console.error(err); alert("Error al guardar."); }
  };

  const saveFromSearch = async (recipe) => {
    if (isOfflineMode) { alert("Modo offline: No se puede guardar ahora."); return; }
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'recipes'), {
        title: recipe.title, ingredients: recipe.ingredients, instructions: recipe.instructions, time: recipe.time,
        difficulty: recipe.difficulty, image: recipe.image || '', createdAt: new Date().toISOString()
      });
    } catch (e) { console.error(e); alert("Error al guardar."); }
  };

  const deleteRecipeFromDb = async (id) => {
    if (isOfflineMode) return;
    if (window.confirm("¿Borrar?")) { try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'recipes', id)); } catch (err) { console.error(err); } }
  };

  // --- CALENDAR LOGIC ---
  const last14Days = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i); dates.push(d.toISOString().split('T')[0]); 
    }
    return dates;
  }, []);

  const assignToCalendar = async (recipe) => {
    if (isOfflineMode) { alert("Modo offline: No se puede editar calendario."); return; }
    if (!user || !calendarModal.date) return;
    const docId = `${calendarModal.date}_${calendarModal.type}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meal_plan', docId), {
      date: calendarModal.date, type: calendarModal.type, recipeTitle: recipe.title, recipeId: recipe.id
    });
    setCalendarModal({ isOpen: false, date: null, type: null });
  };

  const removeFromCalendar = async (date, type) => {
    if (isOfflineMode) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meal_plan', `${date}_${type}`));
  };

  // --- IMPORT/EXPORT LOGIC ---
  const handleImport = async () => {
    if (!importString) return;
    setImportStatus('loading');
    try {
      const cleanString = importString.trim();
      let jsonString = fromBase64(cleanString) || cleanString;
      const data = JSON.parse(jsonString);
      if (!data.recipes || !data.mealPlan) throw new Error("Datos inválidos");

      setSavedRecipes(data.recipes);
      setMealPlan(data.mealPlan);
      saveToCache('recipes', data.recipes);
      saveToCache('mealplan', data.mealPlan);

      if (!isOfflineMode && user) {
        const batch = writeBatch(db);
        data.recipes.forEach(r => {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'recipes', r.id || doc(collection(db, 'artifacts', appId, 'public', 'data', 'recipes')).id);
          batch.set(ref, { ...r, createdAt: r.createdAt || new Date().toISOString() });
        });
        Object.entries(data.mealPlan).forEach(([k, v]) => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'meal_plan', k), v));
        await batch.commit();
      } else {
        alert("¡Datos cargados en local! Se sincronizarán cuando vuelva la conexión.");
      }

      setImportStatus('success');
      setImportString('');
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err) {
      setImportStatus('error');
      alert("Error al importar: Código inválido.");
    }
  };

  const copyToClipboard = () => { navigator.clipboard.writeText(backupString); setCopyStatus(true); setTimeout(() => setCopyStatus(false), 2000); };
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans flex flex-col">
      <header className="bg-emerald-600 text-white p-4 shadow-lg sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ChefHat size={28} />
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Chef Inteligente</h1>
              <div className="flex items-center gap-2 text-xs text-emerald-100">
                {isOfflineMode ? (
                   <span className="flex items-center gap-1 bg-red-500 px-2 py-0.5 rounded-full font-bold animate-pulse"><WifiOff size={10} /> OFFLINE</span>
                ) : (
                   <span className="flex items-center gap-1 bg-emerald-700 px-2 py-0.5 rounded-full"><Wifi size={10} /> Online</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-1 text-sm font-medium mr-2 bg-emerald-700/50 p-1 rounded-lg">
              <button onClick={() => setActiveTab('search')} className={`px-3 py-1.5 rounded-md transition ${activeTab === 'search' ? 'bg-white text-emerald-700 shadow' : 'text-emerald-100 hover:text-white'}`}>Buscador</button>
              <button onClick={() => setActiveTab('saved')} className={`px-3 py-1.5 rounded-md transition ${activeTab === 'saved' ? 'bg-white text-emerald-700 shadow' : 'text-emerald-100 hover:text-white'}`}>Recetas</button>
              <button onClick={() => setActiveTab('calendar')} className={`px-3 py-1.5 rounded-md transition ${activeTab === 'calendar' ? 'bg-white text-emerald-700 shadow' : 'text-emerald-100 hover:text-white'}`}>Calendario</button>
            </div>
            <button onClick={() => setBackupModalOpen(true)} className="bg-emerald-700 hover:bg-emerald-800 p-2 rounded-full transition-colors text-white" title="Configuración / Backup"><Settings size={20} /></button>
          </div>
        </div>
      </header>
      
      {dataError && (
        <div className="bg-orange-100 text-orange-800 text-xs text-center py-3 px-4 border-b border-orange-200 flex justify-center items-center gap-2 font-medium">
           <ShieldAlert size={16} />
           <span>{dataError} - Mostrando copia local segura.</span>
           <button onClick={() => window.location.reload()} className="underline ml-2 flex items-center gap-1"><RefreshCw size={12}/> Reintentar</button>
        </div>
      )}

      <main className="max-w-5xl mx-auto p-4 md:p-6 flex-1 w-full pb-24 md:pb-6">
        {activeTab === 'search' && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
              <div className="text-center mb-6">
                 <h2 className="text-2xl font-bold text-gray-800 mb-2">Buscador</h2>
                 <p className="text-gray-500 text-sm">Busca en tus recetas o internet.</p>
              </div>
              <div className="flex justify-center mb-6">
                <div className="bg-gray-100 p-1 rounded-full flex gap-1 flex-wrap justify-center">
                  <button onClick={() => setSearchSource('local')} className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${searchSource === 'local' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Database size={16} /> Mis Recetas</button>
                  <button onClick={() => setSearchSource('api')} className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${searchSource === 'api' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Globe size={16} /> Internet</button>
                </div>
              </div>
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative flex items-center">
                <Search className="absolute left-4 text-gray-400" />
                <input type="text" placeholder={searchSource === 'local' ? "Pollo, Arroz..." : "Chicken, Pasta..."} className={`w-full pl-12 pr-4 py-4 bg-gray-50 rounded-full border border-gray-200 outline-none transition-all text-lg ${searchSource === 'local' ? 'focus:bg-white focus:border-emerald-500' : 'focus:bg-white focus:border-blue-500'}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <button type="submit" disabled={isSearching} className={`absolute right-2 text-white px-6 py-2 rounded-full font-medium transition disabled:opacity-50 ${searchSource === 'local' ? 'bg-emerald-600' : 'bg-blue-600'}`}>{isSearching ? '...' : 'Buscar'}</button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((recipe) => {
                const savedVersion = savedRecipes.find(saved => saved.title === recipe.title);
                return <RecipeCard key={recipe.id || recipe.tempId} recipe={savedVersion ? { ...recipe, ...savedVersion } : recipe} onSave={saveFromSearch} onEdit={(r) => { setIsCreating(false); setEditingRecipe(r); }} onDelete={deleteRecipeFromDb} onView={setViewingRecipe} isSaved={!!savedVersion || !!recipe.id} isOffline={isOfflineMode} />;
              })}
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <div><h2 className="text-2xl font-bold text-gray-800">Mis Recetas</h2><p className="text-sm text-gray-500">{savedRecipes.length} platos guardados</p></div>
              <button disabled={isOfflineMode} onClick={handleCreateNew} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium shadow-sm flex items-center gap-2 transition disabled:opacity-50"><Plus size={20} /> Crear Receta</button>
            </div>
            {savedRecipes.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border-2 border-dashed border-gray-200">
                <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600">Vacío</h3>
                <p className="text-gray-400 mb-6">Si no ves tus datos, usa la Configuración para importar.</p>
                <button onClick={() => setBackupModalOpen(true)} className="text-emerald-600 font-bold hover:underline">Importar Copia de Seguridad</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onEdit={(r) => { setIsCreating(false); setEditingRecipe(r); }} onDelete={deleteRecipeFromDb} onView={setViewingRecipe} isSaved={true} isOffline={isOfflineMode} />)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Planificador</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase w-32">Fecha</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">1º Plato</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">2º Plato</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {last14Days.map((date) => {
                    const first = mealPlan[`${date}_first`];
                    const second = mealPlan[`${date}_second`];
                    return (
                      <tr key={date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatDate(date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{first ? <div className="flex justify-between items-center group bg-emerald-50 px-3 py-2 rounded-md border border-emerald-100"><span className="text-emerald-800 font-medium truncate max-w-[150px]">{first.recipeTitle}</span><button disabled={isOfflineMode} onClick={() => removeFromCalendar(date, 'first')} className="text-red-400 hover:text-red-600 p-1"><X size={14}/></button></div> : <button disabled={isOfflineMode} onClick={() => setCalendarModal({ isOpen: true, date, type: 'first' })} className="text-gray-400 hover:text-emerald-600 border border-dashed border-gray-300 hover:border-emerald-500 rounded px-3 py-1 text-xs transition flex items-center gap-1 disabled:opacity-30"><Plus size={12}/> Añadir</button>}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{second ? <div className="flex justify-between items-center group bg-emerald-50 px-3 py-2 rounded-md border border-emerald-100"><span className="text-emerald-800 font-medium truncate max-w-[150px]">{second.recipeTitle}</span><button disabled={isOfflineMode} onClick={() => removeFromCalendar(date, 'second')} className="text-red-400 hover:text-red-600 p-1"><X size={14}/></button></div> : <button disabled={isOfflineMode} onClick={() => setCalendarModal({ isOpen: true, date, type: 'second' })} className="text-gray-400 hover:text-emerald-600 border border-dashed border-gray-300 hover:border-emerald-500 rounded px-3 py-1 text-xs transition flex items-center gap-1 disabled:opacity-30"><Plus size={12}/> Añadir</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <button onClick={() => setActiveTab('search')} className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'search' ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}><Search size={24} /> Buscar</button>
        <button onClick={() => setActiveTab('saved')} className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'saved' ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}><BookOpen size={24} /> Recetas</button>
        <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'calendar' ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}><Calendar size={24} /> Calendario</button>
      </nav>

      <Modal isOpen={backupModalOpen} onClose={() => setBackupModalOpen(false)} title="Sincronización">
        <div className="space-y-6">
          <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800 border border-yellow-200 flex gap-2">
             <ShieldAlert className="shrink-0" size={18} />
             <p>Si tienes error 1040 o Offline: Pega aquí el código de respaldo para cargar tus datos localmente.</p>
          </div>
          <div className="border-b pb-6">
            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Download size={18} /> Exportar (Copiar código)</h3>
            <div className="relative"><textarea readOnly className="w-full bg-gray-100 p-3 rounded-lg text-xs font-mono h-24 border focus:ring-2 ring-emerald-500 outline-none resize-none text-gray-600 break-all" value={backupString} onClick={(e) => e.target.select()} /><button onClick={copyToClipboard} className="absolute top-2 right-2 bg-white shadow-sm border p-1 rounded hover:bg-gray-50 text-gray-600">{copyStatus ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}</button></div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Upload size={18} /> Importar (Pegar código)</h3>
            <textarea className="w-full bg-white p-3 rounded-lg text-xs font-mono h-24 border border-gray-300 focus:ring-2 ring-emerald-500 outline-none resize-none break-all" placeholder='Pega aquí el código seguro...' value={importString} onChange={(e) => setImportString(e.target.value)} />
            <button onClick={handleImport} disabled={!importString || importStatus === 'loading'} className="mt-3 w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium flex justify-center items-center gap-2 disabled:opacity-50">{importStatus === 'loading' ? 'Procesando...' : 'Importar Datos Localmente'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingRecipe} onClose={() => { setEditingRecipe(null); setIsCreating(false); }} title={isCreating ? "Nueva Receta Manual" : "Editar Receta"}>
        {editingRecipe && (
          <form onSubmit={handleSaveOrUpdate} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Título</label><input type="text" required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={editingRecipe.title} onChange={(e) => setEditingRecipe({...editingRecipe, title: e.target.value})} placeholder="Ej: Paella" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Imagen URL</label><input type="url" className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" value={editingRecipe.image} onChange={(e) => setEditingRecipe({...editingRecipe, image: e.target.value})} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tiempo</label><input type="text" className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg" value={editingRecipe.time} onChange={(e)=>setEditingRecipe({...editingRecipe, time: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dificultad</label><select className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg" value={editingRecipe.difficulty} onChange={(e)=>setEditingRecipe({...editingRecipe, difficulty: e.target.value})}><option>Fácil</option><option>Media</option><option>Difícil</option></select></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ingredientes</label><textarea required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg h-24" value={Array.isArray(editingRecipe.ingredients)?editingRecipe.ingredients.join(', '):editingRecipe.ingredients} onChange={(e)=>setEditingRecipe({...editingRecipe, ingredients: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones</label><textarea required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg h-32" value={editingRecipe.instructions} onChange={(e)=>setEditingRecipe({...editingRecipe, instructions: e.target.value})} /></div>
            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-bold shadow-md">{isCreating ? 'Crear' : 'Guardar'}</button>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!viewingRecipe} onClose={() => setViewingRecipe(null)} title={viewingRecipe?.title}>
        {viewingRecipe && (
          <div className="space-y-6">
            {viewingRecipe.image && <div className="rounded-xl overflow-hidden shadow-sm h-56 bg-gray-100"><img src={viewingRecipe.image} alt={viewingRecipe.title} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} /></div>}
            <div className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100"><span className="flex items-center gap-2 font-medium"><Clock size={18} className="text-emerald-500"/> {viewingRecipe.time}</span><span className="w-px h-4 bg-gray-300"></span><span className="flex items-center gap-2 font-medium"><ChefHat size={18} className="text-emerald-500"/> {viewingRecipe.difficulty}</span>{viewingRecipe.source === 'Internet' && <button onClick={() => { const text = encodeURIComponent(viewingRecipe.instructions); window.open(`https://translate.google.com/?sl=en&tl=es&text=${text}&op=translate`, '_blank'); }} className="text-blue-600 hover:underline flex items-center gap-1 font-bold"><Languages size={16}/> Traducir</button>}</div>
            <div><h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 border-b pb-2"><UtensilsCrossed size={18} className="text-emerald-600"/> Ingredientes</h3><ul className="grid grid-cols-1 gap-2 text-sm text-gray-700">{(Array.isArray(viewingRecipe.ingredients) ? viewingRecipe.ingredients : viewingRecipe.ingredients.split(',')).map((ing, i) => <li key={i} className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span><span className="capitalize">{typeof ing === 'string' ? ing.trim() : ing}</span></li>)}</ul></div>
            <div><h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 border-b pb-2"><BookOpen size={18} className="text-emerald-600"/> Instrucciones</h3><div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-lg border border-gray-100">{viewingRecipe.instructions}</div></div>
            <div className="flex gap-3 pt-4 border-t"><button onClick={() => setViewingRecipe(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cerrar</button>{viewingRecipe.id ? <button disabled={isOfflineMode} onClick={() => { setViewingRecipe(null); setEditingRecipe(viewingRecipe); }} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"><Edit2 size={16} /> Editar</button> : <button disabled={isOfflineMode} onClick={() => { setViewingRecipe(null); saveFromSearch(viewingRecipe); }} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"><Save size={16} /> Guardar</button>}</div>
          </div>
        )}
      </Modal>
      <Modal isOpen={calendarModal.isOpen} onClose={() => setCalendarModal({ isOpen: false, date: null, type: null })} title="Añadir al Calendario">
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">{savedRecipes.length === 0 ? <div className="text-center py-8"><p className="text-gray-500 mb-2">Sin recetas.</p><button onClick={() => { setCalendarModal({ isOpen: false, date: null, type: null }); handleCreateNew(); }} className="text-emerald-600 font-bold underline">Crear ahora</button></div> : savedRecipes.map((r) => <button key={r.id} onClick={() => assignToCalendar(r)} className="w-full text-left p-3 hover:bg-emerald-50 border border-gray-100 rounded-lg flex justify-between items-center group transition"><div className="flex items-center gap-3 overflow-hidden"><div className="w-10 h-10 bg-gray-200 rounded-md shrink-0 overflow-hidden">{r.image && <img src={r.image} alt="" className="w-full h-full object-cover"/>}</div><span className="font-medium text-gray-700 truncate">{r.title}</span></div><span className="text-emerald-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">ELEGIR</span></button>)}</div>
      </Modal>
    </div>
  );
}36
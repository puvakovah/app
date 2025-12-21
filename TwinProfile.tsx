import React, { useState, useEffect } from 'react';
import { UserProfile, AvatarConfig } from './types';
import { 
    getPresetAvatarUrl, generateMotivationVideo, 
    AvatarGender, AvatarSkin, 
    AvatarHairColor, AvatarHairStyle, AvatarEyeColor, 
    AvatarGlasses, AvatarHeadwear, 
    AvatarTopType, AvatarBottomType, AvatarShoesType, AvatarClothingColor 
} from './geminiService';
import { Video, Loader2, Play, CheckCircle2, User, Palette, Sparkles, Eye, Glasses, Shirt, Footprints, Smile, RefreshCw, Save } from 'lucide-react';
import { translations, Language } from './translations';

interface TwinProfileProps {
  user: UserProfile;
  setUser: (u: UserProfile) => void;
  onOpenSettings?: () => void;
  lang?: Language;
}

const TwinProfile: React.FC<TwinProfileProps> = ({ user, setUser, lang = 'sk' }) => {
  const t = (key: string) => translations[lang][key] || key;

  // --- DYNAMIC OPTIONS BASED ON LANGUAGE ---
  const getHairStyles = () => lang === 'sk' ? [
    { value: 'Short', label: 'Krátke' },
    { value: 'Long', label: 'Dlhé' },
    { value: 'Curly', label: 'Kučeravé' },
    { value: 'Straight', label: 'Rovné' },
    { value: 'Bald', label: 'Plešina' },
    { value: 'Ponytail', label: 'Cipíky' },
    { value: 'Messy', label: 'Rozstrapatené' },
    { value: 'Wavy', label: 'Vlnité' }
  ] : [
    { value: 'Short', label: 'Short' },
    { value: 'Long', label: 'Long' },
    { value: 'Curly', label: 'Curly' },
    { value: 'Straight', label: 'Straight' },
    { value: 'Bald', label: 'Bald' },
    { value: 'Ponytail', label: 'Ponytail' },
    { value: 'Messy', label: 'Messy' },
    { value: 'Wavy', label: 'Wavy' }
  ];

  const getGlasses = () => lang === 'sk' ? [
    { value: 'None', label: 'Žiadne' },
    { value: 'Reading Glasses', label: 'Dioptrické' },
    { value: 'Sunglasses', label: 'Slnečné' },
    { value: 'Round Glasses', label: 'Okrúhle' },
    { value: 'Square Glasses', label: 'Hranaté' }
  ] : [
    { value: 'None', label: 'None' },
    { value: 'Reading Glasses', label: 'Reading Glasses' },
    { value: 'Sunglasses', label: 'Sunglasses' },
    { value: 'Round Glasses', label: 'Round Glasses' },
    { value: 'Square Glasses', label: 'Square Glasses' }
  ];

  const getHeadwear = () => lang === 'sk' ? [
    { value: 'None', label: 'Žiadne' },
    { value: 'Cap', label: 'Šiltovka' },
    { value: 'Beanie', label: 'Čiapka' },
    { value: 'Headphones', label: 'Slúchadlá' },
    { value: 'Bandana', label: 'Šatka' },
    { value: 'Hat', label: 'Klobúk' }
  ] : [
    { value: 'None', label: 'None' },
    { value: 'Cap', label: 'Cap' },
    { value: 'Beanie', label: 'Beanie' },
    { value: 'Headphones', label: 'Headphones' },
    { value: 'Bandana', label: 'Bandana' },
    { value: 'Hat', label: 'Hat' }
  ];

  const getTopTypes = () => lang === 'sk' ? [
    { value: 'T-Shirt', label: 'Tričko' },
    { value: 'Hoodie', label: 'Mikina' },
    { value: 'Shirt', label: 'Košeľa' },
    { value: 'Suit Jacket', label: 'Sako' },
    { value: 'Sweater', label: 'Sveter' },
    { value: 'Tank Top', label: 'Tielko' },
    { value: 'Vest', label: 'Vesta' },
    { value: 'Polo', label: 'Polokošeľa' },
    { value: 'Lab Coat', label: 'Plášť' }
  ] : [
    { value: 'T-Shirt', label: 'T-Shirt' },
    { value: 'Hoodie', label: 'Hoodie' },
    { value: 'Shirt', label: 'Shirt' },
    { value: 'Suit Jacket', label: 'Suit Jacket' },
    { value: 'Sweater', label: 'Sweater' },
    { value: 'Tank Top', label: 'Tank Top' },
    { value: 'Vest', label: 'Vest' },
    { value: 'Polo', label: 'Polo Shirt' },
    { value: 'Lab Coat', label: 'Lab Coat' }
  ];

  const getBottomTypes = () => lang === 'sk' ? [
    { value: 'Jeans', label: 'Rifle' },
    { value: 'Shorts', label: 'Kraťasy' },
    { value: 'Trousers', label: 'Nohavice' },
    { value: 'Skirt', label: 'Sukňa' },
    { value: 'Joggers', label: 'Tepláky' },
    { value: 'Leggings', label: 'Legíny' }
  ] : [
    { value: 'Jeans', label: 'Jeans' },
    { value: 'Shorts', label: 'Shorts' },
    { value: 'Trousers', label: 'Trousers' },
    { value: 'Skirt', label: 'Skirt' },
    { value: 'Joggers', label: 'Joggers' },
    { value: 'Leggings', label: 'Leggings' }
  ];

  const getShoesTypes = () => lang === 'sk' ? [
    { value: 'Sneakers', label: 'Tenisky' },
    { value: 'Boots', label: 'Čižmy' },
    { value: 'Formal Shoes', label: 'Poltopánky' },
    { value: 'Sandals', label: 'Sandále' },
    { value: 'Loafers', label: 'Mokasíny' }
  ] : [
    { value: 'Sneakers', label: 'Sneakers' },
    { value: 'Boots', label: 'Boots' },
    { value: 'Formal Shoes', label: 'Formal Shoes' },
    { value: 'Sandals', label: 'Sandals' },
    { value: 'Loafers', label: 'Loafers' }
  ];

  // --- STATE MANAGEMENT ---
  const cfg = user.avatarConfig || {
      gender: 'Male',
      skin: 'Medium-Light',
      hairColor: 'Brown',
      hairStyle: 'Short',
      eyeColor: 'Brown',
      glasses: 'None',
      headwear: 'None',
      topType: 'T-Shirt',
      topColor: 'White',
      bottomType: 'Jeans',
      bottomColor: 'Blue',
      shoesType: 'Sneakers',
      shoesColor: 'White'
  };
  
  const [gender, setGender] = useState<AvatarGender>(cfg.gender);
  const [skin, setSkin] = useState<AvatarSkin>(cfg.skin);
  
  const [hairColor, setHairColor] = useState<AvatarHairColor>(cfg.hairColor);
  const [hairStyle, setHairStyle] = useState<AvatarHairStyle>(cfg.hairStyle);
  const [eyeColor, setEyeColor] = useState<AvatarEyeColor>(cfg.eyeColor);
  const [glasses, setGlasses] = useState<AvatarGlasses>(cfg.glasses);
  const [headwear, setHeadwear] = useState<AvatarHeadwear>(cfg.headwear);

  const [topType, setTopType] = useState<AvatarTopType>(cfg.topType);
  const [topColor, setTopColor] = useState<AvatarClothingColor>(cfg.topColor);
  
  const [bottomType, setBottomType] = useState<AvatarBottomType>(cfg.bottomType);
  const [bottomColor, setBottomColor] = useState<AvatarClothingColor>(cfg.bottomColor);
  
  const [shoesType, setShoesType] = useState<AvatarShoesType>(cfg.shoesType);
  const [shoesColor, setShoesColor] = useState<AvatarClothingColor>(cfg.shoesColor);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatarUrl);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Mark changes
  useEffect(() => {
      setUnsavedChanges(true);
  }, [gender, skin, hairStyle, hairColor, eyeColor, glasses, headwear, topType, topColor, bottomType, bottomColor, shoesType, shoesColor]);

  // Manual Generation Handler
  const handleGeneratePreview = () => {
    setIsImageLoading(true);
    setImageFailed(false);
    
    const url = getPresetAvatarUrl(
        gender, skin, 
        hairStyle, hairColor, eyeColor, 
        glasses, headwear,
        topType, topColor, 
        bottomType, bottomColor, 
        shoesType, shoesColor,
        'happy', false
    );
    
    setPreviewUrl(url);
  };

  const handleSaveAvatar = () => {
    if (previewUrl && !imageFailed) {
        const newConfig: AvatarConfig = {
            gender, skin, hairStyle, hairColor, eyeColor, 
            glasses, headwear, topType, topColor, 
            bottomType, bottomColor, shoesType, shoesColor
        };
        setUser({ ...user, avatarUrl: previewUrl, avatarConfig: newConfig });
        setUnsavedChanges(false);
    }
  };

  const handleImageLoad = () => setIsImageLoading(false);
  const handleImageError = () => setIsImageLoading(false);

  const handleGenerateVideo = async () => {
    setLoadingVideo(true);
    setGeneratedVideoUrl(null);
    try {
      const videoUrl = await generateMotivationVideo("Animate", user.avatarUrl);
      if (videoUrl) setGeneratedVideoUrl(videoUrl);
    } catch (e) { console.error(e); } 
    finally { setLoadingVideo(false); }
  };

  // --- DATA LISTS (COLORS) ---
  // Colors are visual or same in both langs, labels could be added but usually color name is enough or visual swatch
  const SKINS: {id: AvatarSkin, color: string}[] = [
      { id: 'Light', color: '#fca' }, { id: 'Medium-Light', color: '#eeb' },
      { id: 'Medium', color: '#dca' }, { id: 'Medium-Dark', color: '#a86' }, { id: 'Dark', color: '#543' },
  ];
  const COLORS: {id: AvatarClothingColor, color: string}[] = [
      { id: 'White', color: '#ffffff' }, { id: 'Black', color: '#222222' },
      { id: 'Grey', color: '#888888' }, { id: 'Beige', color: '#d8cfba' },
      { id: 'Red', color: '#ef4444' }, { id: 'Blue', color: '#3b82f6' },
      { id: 'Green', color: '#22c55e' }, { id: 'Yellow', color: '#eab308' },
      { id: 'Pink', color: '#ec4899' }, { id: 'Navy', color: '#000080' }, { id: 'Burgundy', color: '#800020' }
  ];
  const HAIR_COLORS: {id: AvatarHairColor, color: string}[] = [
      { id: 'Blonde', color: '#E6C768' }, { id: 'Brown', color: '#6A4E42' },
      { id: 'Black', color: '#2C2C2C' }, { id: 'Red', color: '#B55239' },
      { id: 'Grey', color: '#9FA3A8' }, { id: 'White', color: '#FFFFFF' },
  ];
  const EYE_COLORS: {id: AvatarEyeColor, color: string}[] = [
      { id: 'Blue', color: '#699BCF' }, { id: 'Green', color: '#74A662' },
      { id: 'Brown', color: '#634e34' }, { id: 'Hazel', color: '#b38b6d' }, { id: 'Grey', color: '#9FA3A8' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in pb-20">
      {/* Builder Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-txt flex items-center gap-2 dark:text-txt-dark">
            <User className="text-primary" /> {t('profile.title')}
        </h2>
        
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-txt-light/10 relative dark:bg-dark-surface dark:border-txt-light/10">
          <div className="flex flex-col md:flex-row gap-8">
              {/* Preview Section */}
              <div className="flex flex-col items-center min-w-[240px]">
                <div className="w-64 h-96 bg-canvas rounded-2xl mb-4 overflow-hidden border-4 border-primary-50 relative group shadow-inner flex items-center justify-center dark:bg-dark-canvas dark:border-primary/20">
                    {previewUrl && !imageFailed ? (
                    <div className="w-full h-full flex items-end justify-center">
                        <div className="w-full h-full relative">
                            <img src={previewUrl} alt="Avatar Preview" className={`w-full h-full object-contain transition-all duration-300 ease-out ${isImageLoading ? 'blur-sm grayscale opacity-80' : 'opacity-100'}`} onLoad={handleImageLoad} onError={handleImageError} />
                            {isImageLoading && <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/20 backdrop-blur-[2px] dark:bg-black/40"><Loader2 className="animate-spin text-primary" size={32} /></div>}
                        </div>
                    </div>
                    ) : ( <div className="w-full h-full flex items-center justify-center bg-canvas text-txt-light dark:bg-dark-canvas dark:text-txt-dark-muted"><User size={64} /></div> )}
                </div>
                
                <div className="flex flex-col gap-3 w-full">
                    <button 
                        onClick={handleGeneratePreview}
                        disabled={isImageLoading}
                        className="w-full bg-secondary hover:bg-secondary-hover text-white px-4 py-3 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={18} className={isImageLoading ? 'animate-spin' : ''} />
                        {t('profile.generate')}
                    </button>

                    {unsavedChanges ? (
                        <button 
                            onClick={handleSaveAvatar} 
                            disabled={isImageLoading || imageFailed || !previewUrl} 
                            className="w-full bg-primary hover:bg-primary-hover text-white px-4 py-3 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 animate-pulse"
                        >
                            <Save size={18} /> {t('profile.save')}
                        </button>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-secondary bg-secondary/10 px-4 py-3 rounded-xl text-sm font-bold w-full border border-secondary/20 dark:text-secondary dark:bg-secondary/20 dark:border-secondary/30">
                            <CheckCircle2 size={18} /> {t('profile.saved')}
                        </div>
                    )}
                </div>
              </div>

              {/* Controls Section */}
              <div className="flex-1 space-y-8 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  
                  {/* 1. Základ */}
                  <div className="space-y-4 pb-4 border-b border-txt-light/10 dark:border-txt-light/10">
                      <label className="text-xs font-bold text-txt-muted uppercase tracking-wider block flex items-center gap-2 dark:text-txt-dark-muted"><User size={14}/> {t('profile.base')}</label>
                      <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => setGender('Male')} className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all ${gender === 'Male' ? 'bg-primary-50 border-primary text-primary ring-1 ring-primary dark:bg-primary/20 dark:border-primary dark:text-white' : 'border-txt-light/30 hover:bg-canvas dark:border-txt-light/20 dark:hover:bg-dark-canvas dark:text-txt-dark-muted'}`}>{t('profile.male')}</button>
                          <button onClick={() => setGender('Female')} className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all ${gender === 'Female' ? 'bg-pink-50 text-pink-600 border-pink-200 ring-1 ring-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800' : 'border-txt-light/30 hover:bg-canvas dark:border-txt-light/20 dark:hover:bg-dark-canvas dark:text-txt-dark-muted'}`}>{t('profile.female')}</button>
                      </div>
                      
                      <div>
                          <span className="text-[10px] font-bold text-txt-muted mb-2 block uppercase tracking-wide dark:text-txt-dark-muted">{t('profile.skin')}</span>
                          <div className="flex gap-2 flex-wrap">
                              {SKINS.map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => setSkin(s.id)}
                                    className={`w-8 h-8 rounded-full border border-txt-light/20 transition-transform hover:scale-110 ${skin === s.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-dark-surface' : ''}`}
                                    style={{ backgroundColor: s.color }}
                                    title={s.id}
                                  />
                              ))}
                          </div>
                      </div>
                  </div>

                  {/* 2. Hlava & Tvár */}
                  <div className="space-y-5 pb-4 border-b border-txt-light/10 dark:border-txt-light/10">
                      <label className="text-xs font-bold text-txt-muted uppercase flex items-center gap-2 dark:text-txt-dark-muted"><Smile size={14}/> {t('profile.head_face')}</label>
                      
                      {/* Vlasy */}
                      <div className="grid grid-cols-1 gap-4">
                          <div>
                              <span className="text-[10px] font-bold text-txt-muted block mb-1 dark:text-txt-dark-muted">{t('profile.hair_style')}</span>
                              <select value={hairStyle} onChange={(e) => setHairStyle(e.target.value as any)} className="w-full text-sm border border-txt-light/30 p-2.5 rounded-lg bg-canvas outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:bg-dark-canvas dark:border-txt-light/20 dark:text-txt-dark">
                                  {getHairStyles().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                          </div>
                          <div>
                              <span className="text-[10px] font-bold text-txt-muted block mb-2 dark:text-txt-dark-muted">{t('profile.hair_color')}</span>
                              <div className="flex gap-2 flex-wrap">
                                  {HAIR_COLORS.map(h => (
                                      <button
                                        key={h.id}
                                        onClick={() => setHairColor(h.id)}
                                        className={`w-8 h-8 rounded-full border border-txt-light/30 transition-transform hover:scale-110 ${hairColor === h.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-dark-surface' : ''}`}
                                        style={{ backgroundColor: h.color }}
                                        title={h.id}
                                      />
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* Oči */}
                      <div>
                          <span className="text-[10px] font-bold text-txt-muted block mb-2 dark:text-txt-dark-muted">{t('profile.eyes')}</span>
                          <div className="flex gap-2 flex-wrap">
                              {EYE_COLORS.map(e => (
                                  <button
                                    key={e.id}
                                    onClick={() => setEyeColor(e.id)}
                                    className={`w-8 h-8 rounded-full border border-txt-light/30 transition-transform hover:scale-110 ${eyeColor === e.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-dark-surface' : ''}`}
                                    style={{ backgroundColor: e.color }}
                                    title={e.id}
                                  />
                              ))}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <span className="text-[10px] font-bold text-txt-muted dark:text-txt-dark-muted">{t('profile.glasses')}</span>
                              <select value={glasses} onChange={(e) => setGlasses(e.target.value as any)} className="w-full text-sm border border-txt-light/30 p-2.5 rounded-lg bg-canvas outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:bg-dark-canvas dark:border-txt-light/20 dark:text-txt-dark">
                                  {getGlasses().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                          </div>
                          <div className="space-y-1">
                              <span className="text-[10px] font-bold text-txt-muted dark:text-txt-dark-muted">{t('profile.hat')}</span>
                              <select value={headwear} onChange={(e) => setHeadwear(e.target.value as any)} className="w-full text-sm border border-txt-light/30 p-2.5 rounded-lg bg-canvas outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:bg-dark-canvas dark:border-txt-light/20 dark:text-txt-dark">
                                  {getHeadwear().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                          </div>
                      </div>
                  </div>

                  {/* 3. Oblečenie */}
                  <div className="space-y-5">
                      <label className="text-xs font-bold text-txt-muted uppercase flex items-center gap-2 dark:text-txt-dark-muted"><Shirt size={14}/> {t('profile.outfit')}</label>
                      
                      {/* Vrch */}
                      <div className="bg-canvas p-3 rounded-xl border border-txt-light/20 space-y-3 dark:bg-dark-canvas dark:border-txt-light/10">
                          <div className="flex justify-between items-center"><span className="text-xs font-bold text-txt dark:text-txt-dark">{t('profile.top')}</span></div>
                          <div className="flex flex-col gap-3">
                              <select value={topType} onChange={(e) => setTopType(e.target.value as any)} className="w-full text-sm border border-txt-light/30 p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/20 dark:bg-dark-surface dark:border-txt-light/20 dark:text-txt-dark">
                                  {getTopTypes().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              <div className="flex gap-1.5 flex-wrap">
                                  {COLORS.map(c => <button key={c.id} onClick={() => setTopColor(c.id)} className={`w-6 h-6 rounded-full border ${topColor === c.id ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-dark-surface' : ''}`} style={{backgroundColor: c.color}} title={c.id} />)}
                              </div>
                          </div>
                      </div>

                      {/* Spodok */}
                      <div className="bg-canvas p-3 rounded-xl border border-txt-light/20 space-y-3 dark:bg-dark-canvas dark:border-txt-light/10">
                          <div className="flex justify-between items-center"><span className="text-xs font-bold text-txt dark:text-txt-dark">{t('profile.bottom')}</span></div>
                          <div className="flex flex-col gap-3">
                              <select value={bottomType} onChange={(e) => setBottomType(e.target.value as any)} className="w-full text-sm border border-txt-light/30 p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/20 dark:bg-dark-surface dark:border-txt-light/20 dark:text-txt-dark">
                                  {getBottomTypes().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              <div className="flex gap-1.5 flex-wrap">
                                  {COLORS.map(c => <button key={c.id} onClick={() => setBottomColor(c.id)} className={`w-6 h-6 rounded-full border ${bottomColor === c.id ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-dark-surface' : ''}`} style={{backgroundColor: c.color}} title={c.id} />)}
                              </div>
                          </div>
                      </div>

                      {/* Topánky */}
                      <div className="bg-canvas p-3 rounded-xl border border-txt-light/20 space-y-3 dark:bg-dark-canvas dark:border-txt-light/10">
                          <div className="flex justify-between items-center"><span className="text-xs font-bold text-txt dark:text-txt-dark">{t('profile.shoes')}</span></div>
                          <div className="flex flex-col gap-3">
                              <select value={shoesType} onChange={(e) => setShoesType(e.target.value as any)} className="w-full text-sm border border-txt-light/30 p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/20 dark:bg-dark-surface dark:border-txt-light/20 dark:text-txt-dark">
                                  {getShoesTypes().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              <div className="flex gap-1.5 flex-wrap">
                                  {COLORS.map(c => <button key={c.id} onClick={() => setShoesColor(c.id)} className={`w-6 h-6 rounded-full border ${shoesColor === c.id ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-dark-surface' : ''}`} style={{backgroundColor: c.color}} title={c.id} />)}
                              </div>
                          </div>
                      </div>
                  </div>

              </div>
          </div>
          
          <div className="mt-6 flex items-start gap-2 text-xs text-txt-muted bg-canvas p-4 rounded-xl border border-txt-light/10 dark:bg-dark-canvas dark:border-txt-light/10 dark:text-txt-dark-muted">
             <Sparkles size={16} className="mt-0.5 text-habit" />
             <p>{t('profile.hint')}</p>
          </div>
        </div>
      </div>

      {/* Video Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-txt flex items-center gap-2 dark:text-txt-dark">
           {t('profile.animate_title')} <span className="bg-habit text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{t('profile.beta')}</span>
        </h2>
        
        <div className="bg-slate-900 p-1 rounded-2xl shadow-xl overflow-hidden aspect-video relative group dark:border dark:border-txt-light/10">
           {generatedVideoUrl ? (
             <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full rounded-xl object-cover" />
           ) : (
             <div className="w-full h-full rounded-xl bg-slate-800 flex flex-col items-center justify-center text-slate-500 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <Video size={48} className="mb-4 opacity-50" />
                <p className="text-sm">{t('profile.video_placeholder')}</p>
             </div>
           )}
        </div>

        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-txt-light/10 dark:bg-dark-surface dark:border-txt-light/10">
           <button onClick={handleGenerateVideo} disabled={loadingVideo || !user.avatarUrl} className="w-full bg-secondary hover:bg-secondary-hover text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
             {loadingVideo ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
             {loadingVideo ? t('profile.preparing') : t('profile.animate_btn')}
           </button>
        </div>
      </div>
    </div>
  );
};

export default TwinProfile;
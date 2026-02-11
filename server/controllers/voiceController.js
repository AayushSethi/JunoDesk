
import { supabase } from '../config/supabase.js';

export const VOICES = [
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Hope' },
    { id: 'flHkNRp1BlvT73UL6gyz', name: 'Jessica' },
    { id: 'qBDvhofpxp92JgXJxDjB', name: 'Lily' },
    { id: 'iiidtqDt9FBdT1vfBluA', name: 'Bill' },
    { id: '94zOad0g7T7K4oa7zhDq', name: 'Jeff' },
    { id: 'UgBBYS2sOqTuMpoF3BR0', name: 'Mark' }
];

export const getVoices = (req, res) => {
    res.json(VOICES.map(v => ({ ...v, provider: '11labs' })));
};

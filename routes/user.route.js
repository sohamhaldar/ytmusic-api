import {registerUser,loginUser,topCharts,currentSongDetail,playSong, trending} from '../controllers/user.controller.js';
import { Router } from 'express';

const router=Router();

router.post('/login',loginUser);
router.post('/register',registerUser);
router.post('/topchart',topCharts);
router.post('/current',currentSongDetail);
router.post('/play',playSong);
router.post('/trending',trending);

export default router;
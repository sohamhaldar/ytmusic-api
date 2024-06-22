import {registerUser,loginUser,topCharts,currentSongDetail,playSong, trending, searchSong} from '../controllers/user.controller.js';
import { Router } from 'express';

const router=Router();

router.post('/login',loginUser);
router.post('/register',registerUser);
router.post('/topchart',topCharts);
router.post('/current',currentSongDetail);
router.get('/play/:videoId',playSong);
router.post('/trending',trending);
router.post('/search',searchSong);
router.post('/search',searchSong);
router.get('/health',(req,res)=>{
    res.json("Working fine ")
});

export default router;
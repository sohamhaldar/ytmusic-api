import { User } from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {
    searchMusics,
    searchAlbums,
    searchPlaylists,
    getSuggestions,
    listMusicsFromAlbum,
    listMusicsFromPlaylist,
    searchArtists,
    getArtist
  } from 'node-youtube-music';
import ytdl from "ytdl-core";
import YoutubeMusicApi from 'youtube-music-api';
import { HttpsProxyAgent } from 'https-proxy-agent';
import ip from 'ip';

const registerUser=async(req,res,next)=>{
    try {
        const {username,email,password}=req.body;
        if(
            [email,username,password].some((field)=>field?.trim()==="")
        ){
            throw new ApiError(400,"All fields are required",);
        }
        const existedUser=await User.findOne({
            $or:[{username},{email}],
        })
        if(existedUser){
            throw new ApiError(409,"User with email or username already exists");
        }
    
        const user= await User.create({
            email,
            password,
            username:username.toLowerCase()
        });
    
        const createdUser=await User.findById(user._id).select(
            "-password -refreshToken"
        ); //it excludes the terms in createdUser
    
        if(!createdUser){
            throw new ApiError(500,"Something went wrong while registering the user");
        }
    
        res.status(201).json(
            new ApiResponse(200,createdUser,"User registered succesfully")
        )
    } catch (error) {
        if (error instanceof ApiError) {
            res.status(error.statusCode).json(new ApiResponse(error.statusCode, error.message));
        }else{
            res.status(500).json(new ApiResponse(500, "Something went wrong"));
        }
    }
}

const loginUser=async(req,res,next)=>{
    try{
        const{username,password}=req.body;
        if(!username){
            throw new ApiError(400,"Username is required");
        }
        const user=await User.findOne({username});
        if(!user){
            throw new ApiError(404,"User does not exist"); 
        }
        
        const isPasswordValid=await user.isPasswordCorrect(password);
        if(!isPasswordValid){
            throw new ApiError(401,"Invalid User credentials");
        }
        const accessToken=await user.generateAccessToken();
        const loggedInUser=await User.findById(user._id).select("-password -refreshToken");
        const options={
            origin:process.env.CORS_ORIGIN,
            httpOnly:true,
            secure:true,
        }
        return res.status(200).cookie("accessToken",accessToken,options).json(new ApiResponse(200,{
            user:loggedInUser,accessToken
        },
        "User logged In succesfully"))
    }catch(error){
        if (error instanceof ApiError) {
            res.status(error.statusCode).json(new ApiResponse(error.statusCode, error.message));
        }else{
            res.status(500).json(new ApiResponse(500, "Something went wrong"));
        }
    }
}

// const express = require('express')const app = express()const port = 3000const IP = require('ip');app.get('/', (req, res) => {    const ipAddress = IP.address();    res.send(ipAddress)})app.listen(port, () => {  console.log(`Example app listening on port ${port}`)})

const playSong=async(req,res,next)=>{
    const {videoId}=req.params;
    console.log(videoId);
    const videoUrl = `https://music.youtube.com/watch?v=${videoId}`;
    // const reqconnection=req.connection.remotePort;
    // console.log(ip.address())
    // console.log(reqconnection);
    // const agent = new HttpsProxyAgent(`http://${ip.address()}:${reqconnection}`);
    // console.log(agent);
    ytdl.getInfo(videoUrl).then((info) => {
    const range = req.headers.range;
    const format = ytdl.chooseFormat(info.formats,{quality:'highestaudio'});
    console.log('format:-',format.audioCodec);
    // res.status(301).redirect(format.url);
    const chunkSize=10**6;
    const start = Number(range.replace(/\D/g, "")); 
    const videoSize=format.contentLength;
    const end = Math.min(start + chunkSize , videoSize-1);
    const contentLength = end-start+1;
    const headers = {
            "Content-Range": `bytes ${start}-${end}/${videoSize}`,
            "Accept-Ranges": 'bytes',
            "Content-Length": contentLength,
            "Content-Type": `audio/${format.audioCodec}`
        }
    res.writeHead(206,headers);

    ytdl.downloadFromInfo(info, { format: format,dlChunkSize:chunkSize ,range:{
        start,end
    },filter:"audioonly"}).pipe(res);
  
}).catch((error) => {
    if (error instanceof ApiError) {
        res.status(error.statusCode).json(new ApiResponse(error.statusCode, error.message)); 
    }else{
        res.status(500).json(new ApiResponse(500, "Something went wrong"));
    }
});    
}

const currentSongDetail=async(req,res,next)=>{
    try {
        const{videoId,baseUrl}=req.body;
        const suggestions = await getSuggestions(videoId);
        const result=[];
        suggestions.map((item)=>{
            const author = item.artists.map(i => i.name).join(', ');
            const r={
                videoId:item.youtubeId,
                url: `${baseUrl}/play/${item.youtubeId}`,
                title: item.title,
                headers: {
                    'range': 'bytes=0-'
                  },
                artist: author,
                artists:item.artists,
                album: item.album,
                artwork: item.thumbnailUrl, // Load artwork from the network
                duration: item.duration.totalSeconds// Duration in seconds
            }
            result.push(r);
        })
        res.status(200).json(result);
        
    } catch (error) {
        if (error instanceof ApiError) {
            res.status(error.statusCode).json(new ApiResponse(error.statusCode, error.message));
        }else{
            res.status(500).json(new ApiResponse(500, "Something went wrong"));
        }
    }
}
const searchSong=async(req,res,next)=>{
    try {
        const{search,type}=req.body;
        const searchType={
            song:searchMusics(search),
            artist:searchArtists(search),
            album:searchAlbums(search),
            playlist:searchPlaylists(search),
        }
        const results = await searchType[type];
        res.status(200).json({
            type,
            music:results
        });
        
    } catch (error) {
        if (error instanceof ApiError) {
            res.status(error.statusCode).json(new ApiResponse(error.statusCode, error.message));
        }else{
            res.status(500).json(new ApiResponse(500, "Something went wrong"));
        }
    }
}

const topCharts=async(req,res,next)=>{
    try{
        const {query}=req.body;
        const api = new YoutubeMusicApi();
        const playlists = await searchPlaylists(query);
        api.initalize() // Retrieves Innertube Config
        .then(info => {
            api.getPlaylist(playlists[0].playlistId).then(result=>{
                res.status(200).json(result.content);
            });
        })
        
    } catch (error) {
        if (error instanceof ApiError) {
            res.status(error.statusCode).json(new ApiResponse(error.statusCode, error.message));
        }else{
            res.status(500).json(new ApiResponse(500, "Something went wrong"));
        }
    }
}

const trending=async(req,res,next)=>{
    try {
        const{option}=req.body;
        console.log(option);
        const trendingOption={
            PopHits:"RDCLAK5uy_nSq67AJ2d75MFNJ3j_4ClEtSgC-opBM84",
            SweetheartPop:"RDCLAK5uy_l1oO11DBO4FD8U7bOrqUKK5Y_PkISUMQM",
            PopCertified:"RDCLAK5uy_lBNUteBRencHzKelu5iDHwLF6mYqjL-JU",
            PopBiggestHits:"RDCLAK5uy_nmS3YoxSwVVQk9lEQJ0UX4ZCjXsW_psU8"
        }
        const results = await listMusicsFromPlaylist(trendingOption[option]);
        res.status(200).json(results);
        
    } catch (error) {
        if (error instanceof ApiError) {
            res.status(error.statusCode).json(new ApiResponse(error.statusCode, error.message));
        }else{
            res.status(500).json(new ApiResponse(500, "Something went wrong"));
        }
    }
}



export {
    registerUser,loginUser,playSong,currentSongDetail,topCharts,trending,searchSong
}
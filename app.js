import express from "express";
import userRouter from './routes/user.route.js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({
    path:'./.env'
})

const app=express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))



app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use('/',userRouter);
app.use('/fine',(req,res)=>{
    res.json({
        msg:'working fine'
    })
})

app.listen(process.env.PORT||8000,()=>{
    console.log(`server connected at PORT:${process.env.PORT}`);
})

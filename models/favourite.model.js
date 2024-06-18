import mongoose,{Schema} from "mongoose";

const author={
    name:{
        type:String,
        required:true
    },
    browseId:{
        type:String
    }
}

const favSchema=Schema({
    user:{
        type:Schema.Types.ObjectId, 
        ref:"User"
    },
    songs:[{
        videoId:{
            type:String,
            required:true
        },
        thumbnail:{
            type:String,
            required:true
        },
        author:author,
        duration:{
            type:Number
        }
    }]
},{
    timeStamps:true
})

export const Favourite=mongoose.model('Favourite',favSchema);


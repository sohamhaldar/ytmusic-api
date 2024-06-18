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

const PlaylistSchema=Schema({
    title:{
        type:String,
        required:true
    },
    thumbnail:{
        type:String
    },
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

export const Playlist=mongoose.model('Playlist',PlaylistSchema);


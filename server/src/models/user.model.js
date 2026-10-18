import mongoose,{Schema} from "mongoose"
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken';

const userSchema = new Schema({
    name:{
        type:String,
        trim:true,
        maxlength:60
    },
    username:{
        type:String,
        minlength:3,
        maxlength:30,
        unique:true,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true
    },
    password:{
        type:String,
        required:true
    }
},{timestamps:true})

userSchema.pre("save", async function () {
    if(!this.isModified("password")){
        return;
    }
     this.password = await bcrypt.hash(this.password, 10);
})

userSchema.methods.isPasswordCorrect = async function name(password) {
    return await bcrypt.compare(password,this.password)
}


userSchema.methods.generateAccessToken= function(){
    return jwt.sign(
        {
        _id:this._id,
        email:this.email,
        username:this.username},
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )

}

userSchema.methods.generateRefreshToken =function(){
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export default mongoose.models.User || mongoose.model("User", userSchema);

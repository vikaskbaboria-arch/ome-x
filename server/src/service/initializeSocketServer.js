import { isValidObjectId } from "mongoose";
import jwt from "jsonwebtoken"
import {Server, Socket}  from "socket.io"
import User from "../models/user.model.js";
import { registerMatchingHandlers } from "../socket/matching.socket.js";
import { registerSignalingHandlers } from "../socket/signaling.socket.js";



export const initializeSocketServer =(httpServer) =>{
    const io = new Server(httpServer,{
        cors:{
            origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim()),
            credentials:true
        }
    });

    io.use(
        async(socket, next)=>{
            try {
                const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace(/^Bearer\s+/i,"")
                if(!token){
                    return next(new Error("Authentication required"))

                }

                const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
                if(!isValidObjectId(decodedToken?._id)){
                    return next(new Error("not a valid "))
                }
                const user = await User.findById(decodedToken?._id).
                select("_id");
                if(!user){
                    return next(new Error("Invalid access token"))
                }
                socket.data.userId = String(user._id)
                return next();

            } catch (error) {
                return next(new Error("Invalid access Token"))
            }
        }
    );
    io.on("connection",(socket)=>{
        const userId = socket.data.userId;
        socket.join(`user:${userId}`);

        socket.join(`user:${socket.data.userId}`)

        // registe and signaler will be here

        registerMatchingHandlers(io, socket);
        registerSignalingHandlers(io, socket);
        socket.on("disconnect", (reason) => {
            console.log("User disconnected: ", socket.data.userId, reason);
        });
    })
}

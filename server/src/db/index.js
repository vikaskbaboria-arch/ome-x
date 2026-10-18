import mongoose from "mongoose";

let isConnected = false; // Track connection status

const connectDB = async () => {
    if (isConnected) {
        console.log("MongoDB is already connected");
        return;
    }

    try {
        const mongoUri = process.env.MONGODB_URI; 
        if (!mongoUri) throw new Error("MONGODB_URI is not configured");
        const connect = await mongoose.connect(mongoUri);
        isConnected = true;
        console.log(`MongoDB connected: ${connect.connection.host}`);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
};

export default connectDB;

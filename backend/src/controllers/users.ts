import   { RequestHandler } from "express";
import createHttpError from "http-errors";
import userModel from "../models/user";
import bcrypt from "bcrypt";

export const getAuthenticatedUser : RequestHandler = async(req,res,next)=>{
    const authenticatedUserId=req.session.userId;
    try{
        if(!authenticatedUserId){
            throw createHttpError(401,"User not Authenticated");
        }
        const user = await userModel.findById(authenticatedUserId).select("+email").exec();
        res.status(200).json(user);
    }
    catch(er){
        next(er);
    }
}


interface SignUpBody{
    username?:string,
    email?: string,
    password?: string,
}

export const signup: RequestHandler<unknown,unknown,SignUpBody, unknown> = async(req, res,next) => {
    const username=req?.body?.username;
    const email=req?.body?.email;
    const passwordRaw=req?.body?.password;
    try{
        if(!username || !email || !passwordRaw){
            throw createHttpError(400,"Missing fields");
        }
        const existingUserName=await userModel.findOne({username:username}).exec();
        if(existingUserName){
            throw createHttpError(409,"UserName already taken please choose a different one or log in instead");
        }
        const existingEmail=await userModel.findOne({email:email}).exec();
        if(existingEmail){
            throw createHttpError(409,"A user with this email alreadt exists.Please log in instead");
        }
        const passwordHashed=await bcrypt.hash(passwordRaw,10);
        const newUser=await userModel.create({
            username:username,
            email:email,
            password:passwordHashed
        });
        req.session.userId=newUser._id;
        res.status(201).json(newUser);
    }catch(error){
        next(error);
    }
};

interface LoginBody{
    username?:string,
    password?:string,
}

export const login:RequestHandler<unknown,unknown,LoginBody,unknown>=async (req,res,next)=>{
    const username=req.body.username;
    const password=req.body.password;
    try{
        if(!username || !password)
        {
            throw createHttpError(400,'missing field');
        }
        const user=await userModel.findOne({username:username}).select("+password +email").exec();
        if(!user){
            throw createHttpError(401,"Invalid credentials");
        }
        const passwordMatch=await bcrypt.compare(password,user.password);
        if(!passwordMatch){
            throw createHttpError(401,"Invalid credentials");
        }
        req.session.userId=user._id;
        res.status(201).json(user);
    }
    catch(E){
        next(E);
    }
}

export const logout:RequestHandler =(req,res,next)=>
{   
    req.session.destroy(err=>{
        if(err){
            next(err);
        }
        else res.sendStatus(200);
    })
}
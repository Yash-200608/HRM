const Role = require("../../models/personalOffice/roleModel");

const createRole = async(req,res)=>{
 try{
   const {companyId, roleName, permissions, createdBy} = req.body;

   const role = await Role.create({
     companyId,
     roleName,
     permissions,
     createdBy
   });

   res.status(201).json(role);

 }catch(err){
   res.status(500).json({message:"Server Error"});
 }
};

const getRoles = async(req,res)=>{
 try{
   const {companyId} = req.params;

   const data = await Role.find({companyId}).sort({createdAt:-1});

   res.json(data);

 }catch(err){
   res.status(500).json({message:"Server Error"});
 }
};

const updateRole = async(req,res)=>{
 try{
   const {id} = req.params;

   const updated = await Role.findByIdAndUpdate(id, req.body,{new:true});

   res.json(updated);

 }catch(err){
   res.status(500).json({message:"Server Error"});
 }
};

const deleteRole = async(req,res)=>{
 try{
   await Role.findByIdAndDelete(req.params.id);
   res.json({message:"Deleted"});
 }catch(err){
   res.status(500).json({message:"Server Error"});
 }
};

module.exports = {
 createRole,
 getRoles,
 updateRole,
 deleteRole
};
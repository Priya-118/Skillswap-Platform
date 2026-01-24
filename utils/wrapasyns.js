module.exports= (fun) =>{
  return (req,res,next)=>{
    fun(req,res,next).catch(next);
  }
}

//better way to write try-catch block
class ApiError extends Error{
    constructor(
        statusCode,
        message="SOMETHING WENT WRONG",
        errors=[],

    ){
        super(message)
        this.statusCode=statusCode
        this.success= false
        this.message= message
        this.errors=errors

    }
}

export{ApiError}
import {checkout,response} from '@/lib/store';
export async function POST(req:Request){try{return await checkout(req);}catch(e){return response({error:e instanceof Error?e.message:'Unable to start checkout.'},400);}}

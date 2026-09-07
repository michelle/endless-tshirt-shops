import {quoteSchema} from '@/lib/validation';
import {makeQuote} from '@/lib/prodigi';
import {AppError,fail,guard,json,readBody} from '@/lib/security';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){try{guard(request,20);const result=quoteSchema.safeParse(await readBody(request));if(!result.success)throw new AppError(result.error.issues[0]?.message??'Check your shipping details.');return json(await makeQuote(result.data.items,result.data.recipient));}catch(error){return fail(error)}}

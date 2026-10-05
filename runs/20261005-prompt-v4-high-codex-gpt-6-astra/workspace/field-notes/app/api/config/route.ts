import {configured,live,response} from '@/lib/store';
export function GET(){return response({checkoutEnabled:configured(),mode:live()?'live':'sandbox'});}

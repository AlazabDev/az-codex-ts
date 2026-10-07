import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
const BASE = 'https://connector-gateway.lovable.dev';
const SCOPES = ['read:user','repo'];
export const startGithubConnect = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {getConnectionKeyForUser}=await import('./integrations/connections.server'); const {authorizeAppUserOAuth}=await import('@/integrations/lovable/appUserConnector');
 const clientAPIKey=process.env['GITHUB_APP_USER_CONNECTOR_CLIENT_API_KEY']; if(!clientAPIKey)throw new Error('إعداد GitHub غير مكتمل');
 const req=getRequest(); const url=new URL(req.url); const host=url.hostname==='localhost'?req.headers.get('x-forwarded-host'):null;
 return authorizeAppUserOAuth({gatewayBaseUrl:BASE,connectorId:'github',appUserId:context.userId,clientAPIKey,returnUrl:new URL('/oauth/github/return',host?`https://${host}`:url.origin).toString(),connectionAPIKey:await getConnectionKeyForUser(context.userId,'github')??undefined,credentialsConfiguration:{scopes:SCOPES}});
});
export const completeGithubConnection=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d)=>z.object({code:z.string().min(1).max(4096)}).parse(d)).handler(async({context,data})=>{
 const {exchangeAppUserOAuthCode}=await import('@/integrations/lovable/appUserConnector'); const {saveConnectionKeyForUser}=await import('./integrations/connections.server');
 const result=await exchangeAppUserOAuthCode(BASE,data.code); if(result.connectorId!=='github')throw new Error('اتصال غير صالح');await saveConnectionKeyForUser(context.userId,'github',result.connectionAPIKey);return {ok:true};
});
export const disconnectGithub=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{const store=await import('./integrations/connections.server');const key=await store.getConnectionKeyForUser(context.userId,'github');if(key){const {disconnectAppUser}=await import('@/integrations/lovable/appUserConnector');await disconnectAppUser({gatewayBaseUrl:BASE,connectionAPIKey:key,connectorId:'github'});await store.deleteConnectionForUser(context.userId,'github');}return {ok:true};});
const name=z.string().regex(/^[a-zA-Z0-9_.-]+$/).max(100);
export const browseGithub=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d)=>z.object({view:z.enum(['repos','files','commits','branches']),owner:name.optional(),repo:name.optional(),path:z.string().max(2000).default(''),ref:z.string().max(200).default(''),page:z.number().int().min(1).max(100).default(1)}).parse(d)).handler(async({context,data})=>{
 const {getConnectionKeyForUser}=await import('./integrations/connections.server');const key=await getConnectionKeyForUser(context.userId,'github');if(!key)return {connected:false,reconnectRequired:false,items:[],content:null};
 const {callAsAppUser,appUserReconnectRequired}=await import('@/integrations/lovable/appUserConnector');
 let path=`/user/repos?per_page=30&sort=updated&page=${data.page}`;
 if(data.view!=='repos'){if(!data.owner||!data.repo)throw new Error('حدد المستودع'); const prefix=`/repos/${encodeURIComponent(data.owner)}/${encodeURIComponent(data.repo)}`;const ref=data.ref?`&ref=${encodeURIComponent(data.ref)}`:'';
 path=data.view==='commits'?`${prefix}/commits?per_page=30&page=${data.page}${data.ref?`&sha=${encodeURIComponent(data.ref)}`:''}`:data.view==='branches'?`${prefix}/branches?per_page=100`:`${prefix}/contents/${data.path.split('/').map(encodeURIComponent).join('/')}?per_page=100${ref}`;}
 const res=await callAsAppUser({gatewayBaseUrl:BASE,connectionAPIKey:key,connectorId:'github',path,requiredScopes:SCOPES,init:{headers:{Accept:'application/vnd.github+json'}}});
 if(await appUserReconnectRequired(res))return {connected:false,reconnectRequired:true,items:[],content:null};
 if(!res.ok){const text=await res.text();let message=text;try{message=JSON.parse(text).message??text;}catch{/* plain response */}throw new Error(`GitHub (${res.status}): ${message}`);}
 const raw=await res.json();
 if(data.view==='files'&&!Array.isArray(raw)){return {connected:true,reconnectRequired:false,items:[],content:{name:String(raw.name),path:String(raw.path),encoding:String(raw.encoding),value:typeof raw.content==='string'?raw.content:'',size:Number(raw.size),type:String(raw.type)}};}
 const items=(raw as Record<string,any>[]).map((r)=>data.view==='repos'?{id:String(r.id),name:String(r.name),owner:String(r.owner?.login),label:String(r.full_name),description:String(r.description??''),private:Boolean(r.private),ref:String(r.default_branch)}:data.view==='commits'?{id:String(r.sha),name:String(r.commit?.message??''),label:String(r.sha).slice(0,7),description:String(r.commit?.author?.name??''),date:String(r.commit?.author?.date??'')}:data.view==='branches'?{id:String(r.name),name:String(r.name)}:{id:String(r.path),name:String(r.name),path:String(r.path),type:String(r.type),size:Number(r.size)});
 return {connected:true,reconnectRequired:false,items,content:null};
});

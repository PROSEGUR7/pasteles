(()=>{var a={};a.id=300,a.ids=[300],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},35552:(a,b,c)=>{"use strict";c.a(a,async(a,d)=>{try{c.d(b,{A:()=>g});var e=c(64939),f=a([e]);let g=new(e=(f.then?(await f)():f)[0]).Pool({host:process.env.DB_HOST,port:parseInt(process.env.DB_PORT||"29711"),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:{rejectUnauthorized:!1},max:10,idleTimeoutMillis:3e4,connectionTimeoutMillis:1e4});d()}catch(a){d(a)}})},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},64939:a=>{"use strict";a.exports=import("pg")},78335:()=>{},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},88389:(a,b,c)=>{"use strict";c.a(a,async(a,d)=>{try{c.r(b),c.d(b,{handler:()=>x,patchFetch:()=>w,routeModule:()=>y,serverHooks:()=>B,workAsyncStorage:()=>z,workUnitAsyncStorage:()=>A});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(51356),u=c(97435),v=a([u]);u=(v.then?(await v)():v)[0];let y=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/conversaciones/[waId]/route",pathname:"/api/conversaciones/[waId]",filename:"route",bundlePath:"app/api/conversaciones/[waId]/route"},distDir:".next-prod",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\brand\\OneDrive\\Documentos\\Proyectos softdatai\\pasteles\\src\\app\\api\\conversaciones\\[waId]\\route.ts",nextConfigOutput:"",userland:u}),{workAsyncStorage:z,workUnitAsyncStorage:A,serverHooks:B}=y;function w(){return(0,g.patchFetch)({workAsyncStorage:z,workUnitAsyncStorage:A})}async function x(a,b,c){var d;let e="/api/conversaciones/[waId]/route";"/index"===e&&(e="/");let g=await y.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:z,routerServerContext:A,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(z.dynamicRoutes[E]||z.routes[D]);if(F&&!x){let a=!!z.routes[D],b=z.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||y.isDev||x||(G=D,G="/index"===G?"/":G);let H=!0===y.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:z,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>y.onRequestError(a,b,d,A)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>y.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await y.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})},A),b}},l=await y.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:z,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",B?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await y.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}d()}catch(a){d(a)}})},89102:(a,b,c)=>{"use strict";c.a(a,async(a,d)=>{try{c.d(b,{JC:()=>l,Sk:()=>k,kH:()=>o,lU:()=>n,vs:()=>m,zk:()=>j});var e=c(35552),f=a([e]);e=(f.then?(await f)():f)[0];let p=!1;async function g(){p||(await e.A.query(`
        CREATE TABLE IF NOT EXISTS meta_conversations (
            wa_id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            canal TEXT NOT NULL DEFAULT 'WhatsApp',
            last_message TEXT,
            last_message_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            estado TEXT NOT NULL DEFAULT 'abierto',
            closed_at TIMESTAMPTZ,
            bot_status TEXT NOT NULL DEFAULT 'activo'
        );
    `),await e.A.query(`
        ALTER TABLE meta_conversations
        ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'abierto';
    `),await e.A.query(`
        ALTER TABLE meta_conversations
        ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
    `),await e.A.query(`
        ALTER TABLE meta_conversations
        ADD COLUMN IF NOT EXISTS bot_status TEXT NOT NULL DEFAULT 'activo';
    `),await e.A.query(`
        CREATE TABLE IF NOT EXISTS meta_messages (
            id SERIAL PRIMARY KEY,
            wa_id TEXT NOT NULL REFERENCES meta_conversations(wa_id) ON DELETE CASCADE,
            message_id TEXT UNIQUE,
            direction TEXT NOT NULL,
            body TEXT,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            raw JSONB,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `),p=!0)}async function h(a){let{waId:b,nombre:c,canal:d,lastMessage:f,lastMessageAt:g}=a;await e.A.query(`INSERT INTO meta_conversations (wa_id, nombre, canal, last_message, last_message_at, estado, closed_at, bot_status)
         VALUES ($1, $2, $3, $4, $5, 'abierto', NULL, 'activo')
         ON CONFLICT (wa_id)
         DO UPDATE SET nombre = EXCLUDED.nombre,
                       canal = EXCLUDED.canal,
                       last_message = EXCLUDED.last_message,
                       last_message_at = EXCLUDED.last_message_at,
                       estado = 'abierto',
                       closed_at = NULL;`,[b,c,d,f,g.toISOString()])}async function i(a){let{waId:b,messageId:c,direction:d,body:f,timestamp:g,raw:h}=a;await e.A.query(`INSERT INTO meta_messages (wa_id, message_id, direction, body, timestamp, raw, read_at)
         VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $3 = 'inbound' THEN NULL ELSE NOW() END)
         ON CONFLICT (message_id) DO NOTHING;`,[b,c,d,f,g.toISOString(),h])}async function j(a){await g();let b=[];if(Array.isArray(a.entry))for(let c of a.entry)for(let a of c.changes??[])b.push(a);for(let c of("messages"===a.field&&a.value&&b.push({field:a.field,value:a.value}),b)){let a=c.value;if(!a)continue;let b=a.messages??[];if(!b.length)continue;let d=a.contacts??[];for(let a of b){let b=a.from||a.to;if(!b)continue;let c=d.find(a=>a.wa_id===b)??d[0],e=c?.profile?.name||b,f=function(a){if("text"===a.type&&a.text?.body)return a.text.body;if("button"===a.type&&a.button?.text)return a.button.text;if("interactive"===a.type){if(a.interactive?.button_reply?.title)return a.interactive.button_reply.title;if(a.interactive?.list_reply?.title)return a.interactive.list_reply.title}return"image"===a.type&&a.image?.caption?a.image.caption:"document"===a.type&&a.document?.filename?`Archivo: ${a.document.filename}`:a.type?`Mensaje ${a.type}`:"Mensaje"}(a),g=function(a){if(!a)return new Date;let b=Number(a);if(!Number.isNaN(b))return new Date(1e3*b);let c=new Date(a);return Number.isNaN(c.getTime())?new Date:c}(a.timestamp),j=a.from?"inbound":"outbound";await h({waId:b,nombre:e,canal:"WhatsApp",lastMessage:f,lastMessageAt:g}),await i({waId:b,messageId:a.id,direction:j,body:f,timestamp:g,raw:a})}}}async function k(a){await g();let b=[],c=[];a&&(b.push(a),c.push(`c.canal = $${b.length}`));let d=c.length?`WHERE ${c.join(" AND ")}`:"";return(await e.A.query(`WITH unread AS (
            SELECT wa_id, COUNT(*) AS unread_count
            FROM meta_messages
            WHERE direction = 'inbound' AND read_at IS NULL
            GROUP BY wa_id
        )
         SELECT c.wa_id, c.nombre, c.canal, c.last_message, c.last_message_at, c.estado, c.bot_status,
               COALESCE(u.unread_count, 0) AS unread_count
        FROM meta_conversations c
        LEFT JOIN unread u ON u.wa_id = c.wa_id
        ${d}
        ORDER BY c.last_message_at DESC NULLS LAST
        LIMIT 200;`,b)).rows.map(a=>({waId:a.wa_id,nombre:a.nombre,canal:a.canal,lastMessage:a.last_message,lastMessageAt:a.last_message_at,unreadCount:Number(a.unread_count||0),estado:a.estado||"abierto",botStatus:a.bot_status||"activo"}))}async function l(a){return await g(),(await e.A.query(`SELECT message_id, direction, body, timestamp, raw
         FROM meta_messages
         WHERE wa_id = $1
         ORDER BY timestamp ASC
         LIMIT 500;`,[a])).rows.map(a=>{let b=a.raw||{},c=a.direction;return{messageId:a.message_id,direction:c,body:a.body,timestamp:a.timestamp,senderType:((a,b)=>{let c=[a?.senderType,a?.sender_type,a?.actor,a?.sender,a?.role,a?.source,a?.intervenedBy].find(a=>"string"==typeof a)?.toString().toLowerCase();if(c){if(/(ia|ai|bot|assistant)/.test(c))return"ia";if(/(humano|human|agent|asesor|admin)/.test(c))return"humano";if(/(cliente|client|user|contacto)/.test(c))return"cliente";if(/(system|sistema)/.test(c))return"sistema"}return"inbound"===b?"cliente":"ia"})(b,c),interventionStatus:(a=>{let b=[a?.interventionStatus,a?.intervention_status,a?.agentStatus,a?.agent_status,a?.status,a?.estado,a?.mode].find(a=>"string"==typeof a)?.toString().toLowerCase();return b?/(activo|active|on|enabled)/.test(b)?"activo":/(inactivo|inactive|off|disabled|paused)/.test(b)?"inactivo":null:null})(b),source:"meta"}})}async function m(a){await g(),await e.A.query(`UPDATE meta_messages
         SET read_at = NOW()
         WHERE wa_id = $1 AND direction = 'inbound' AND read_at IS NULL;`,[a])}async function n(a){await g(),await e.A.query(`UPDATE meta_conversations
         SET estado = 'cerrado', closed_at = NOW()
         WHERE wa_id = $1;`,[a])}async function o(a,b){await g(),await e.A.query(`UPDATE meta_conversations
         SET bot_status = $2
         WHERE wa_id = $1;`,[a,b])}d()}catch(a){d(a)}})},96487:()=>{},97435:(a,b,c)=>{"use strict";c.a(a,async(a,d)=>{try{c.r(b),c.d(b,{DELETE:()=>k,GET:()=>i,PATCH:()=>j,PUT:()=>l});var e=c(10641),f=c(89102),g=c(35552),h=a([f,g]);async function i(a,{params:b}){try{let{waId:a}=await b,c=await (0,f.JC)(a);return e.NextResponse.json({messages:c})}catch(a){return console.error("[Conversaciones] Error obteniendo mensajes:",a),e.NextResponse.json({error:"No se pudieron obtener los mensajes"},{status:500})}}async function j(a,{params:b}){try{let{waId:a}=await b;return await (0,f.vs)(a),e.NextResponse.json({ok:!0})}catch(a){return console.error("[Conversaciones] Error marcando como le\xeddo:",a),e.NextResponse.json({error:"No se pudo actualizar el estado de lectura"},{status:500})}}async function k(a,{params:b}){try{let{waId:a}=await b;return await (0,f.lU)(a),e.NextResponse.json({ok:!0})}catch(a){return console.error("[Conversaciones] Error cerrando chat:",a),e.NextResponse.json({error:"No se pudo cerrar la conversaci\xf3n"},{status:500})}}async function l(a,{params:b}){try{let{waId:c}=await b,d=await a.json();if("activo"!==d.botStatus&&"inactivo"!==d.botStatus)return e.NextResponse.json({error:"Estado de bot inv\xe1lido"},{status:400});await (0,f.kH)(c,d.botStatus);let h=c.replace(/\D/g,"");if(!h)return e.NextResponse.json({error:"No se pudo interpretar el tel\xe9fono del chat"},{status:400});let i=await g.A.query(`WITH candidates AS (
                SELECT
                    id_cliente,
                    REGEXP_REPLACE(COALESCE(telefono, ''), '\\D', '', 'g') AS telefono_digits
                FROM clientes
            ), ranked AS (
                SELECT
                    id_cliente,
                    CASE
                        WHEN telefono_digits = $1 THEN 3
                        WHEN RIGHT(telefono_digits, 10) = RIGHT($1, 10) THEN 2
                        WHEN telefono_digits LIKE '%' || $1 THEN 1
                        ELSE 0
                    END AS score,
                    LENGTH(telefono_digits) AS len
                FROM candidates
                WHERE telefono_digits <> ''
                  AND (
                    telefono_digits = $1
                    OR RIGHT(telefono_digits, 10) = RIGHT($1, 10)
                    OR telefono_digits LIKE '%' || $1
                  )
                ORDER BY score DESC, len ASC
                LIMIT 1
            )
            UPDATE clientes c
            SET estado = $2
            FROM ranked r
            WHERE c.id_cliente = r.id_cliente
            RETURNING c.id_cliente, c.estado;`,[h,d.botStatus]);if(!i.rowCount){let a=await g.A.query(`SELECT nombre
                 FROM meta_conversations
                 WHERE wa_id = $1
                 LIMIT 1;`,[c]),b=a.rows[0]?.nombre;b&&(i=await g.A.query(`WITH ranked AS (
                        SELECT id_cliente
                        FROM clientes
                        WHERE LOWER(TRIM(COALESCE(nombre, ''))) = LOWER(TRIM($1))
                        ORDER BY id_cliente DESC
                        LIMIT 1
                    )
                    UPDATE clientes c
                    SET estado = $2
                    FROM ranked r
                    WHERE c.id_cliente = r.id_cliente
                    RETURNING c.id_cliente, c.estado;`,[b,d.botStatus]))}return e.NextResponse.json({ok:!0,botStatus:d.botStatus,clienteUpdated:!!i.rowCount,cliente:i.rows[0]??null,warning:i.rowCount?null:"No se encontr\xf3 cliente vinculado para actualizar estado en la tabla clientes"})}catch(a){return console.error("[Conversaciones] Error actualizando bot:",a),e.NextResponse.json({error:"No se pudo actualizar el estado del bot"},{status:500})}}[f,g]=h.then?(await h)():h,d()}catch(a){d(a)}})}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[331,692],()=>b(b.s=88389));module.exports=c})();
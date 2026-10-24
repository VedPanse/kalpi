import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
export function createStore(path='data/kalpi.sqlite'){
const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, kind TEXT, body TEXT);');
const all=kind=>db.prepare('SELECT body FROM records WHERE kind=?').all(kind).map(r=>JSON.parse(r.body));
const get=id=>{let r=db.prepare('SELECT body FROM records WHERE id=?').get(id);return r?JSON.parse(r.body):null};
const put=(kind,o)=>{db.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?)').run(o.id,kind,JSON.stringify(o));return o};
const remove=id=>db.prepare('DELETE FROM records WHERE id=?').run(id);
return {db,all,get,put,remove,id:()=>randomUUID(),hash:s=>createHash('sha256').update(s).digest('hex')};
}

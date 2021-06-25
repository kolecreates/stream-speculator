export default async <T>(method: string, path: string) : Promise<T> => {
    try {
        const res = await fetch(path, { method });
        if(res.status === 200){
            return (await res.json()) as T;
        }
        throw new Error(`${method} ${path} ${res.status} ${res.statusText}`);
    }catch(e){
        throw e;
    }
};
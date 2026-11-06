const supabaseUrl = 'https://gltraqharnkpnrrhltxl.supabase.co';
const supabaseKey = 'sb_publishable_df7MFY-Vgoee03SdTH9jHQ_uaIFa_ac';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);
let currentUser = null;

window.onload = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
    }
};

function handleEnter(e) {
    if(e.key === 'Enter') login();
}

async function login() {
    const inputVal = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');
    const btnLogin = document.getElementById('btn-login');

    if(!inputVal) return;

    btnLogin.innerText = "Carregant...";
    btnLogin.disabled = true;

    let res = await supabase.auth.signInWithPassword({
        email: 'hola@gravelcatalunya.com',
        password: inputVal
    });

    if (!res.error && res.data.user) {
        currentUser = res.data.user;
        errorMsg.classList.add('hidden');
        showApp();
    } else {
        const dynamicEmail = inputVal.toLowerCase() + '@gravelcatalunya.com';
        let res2 = await supabase.auth.signInWithPassword({
            email: dynamicEmail,
            password: inputVal
        });

        if (!res2.error && res2.data.user) {
            currentUser = res2.data.user;
            errorMsg.classList.add('hidden');
            showApp();
        } else {
            errorMsg.innerText = "Codi incorrecte o usuari no trobat.";
            errorMsg.classList.remove('hidden');
        }
    }
    
    btnLogin.innerText = "Entrar";
    btnLogin.disabled = false;
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('btn-logout-header').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-password').value = '';
    document.getElementById('llista-sortides').innerHTML = '';
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('btn-logout-header').classList.remove('hidden');
    carregarSortides();
}

async function pujarImatge() {
    const imatgeFile = document.getElementById('imatge').files[0];
    if (!imatgeFile) return null;
    const fileExt = imatgeFile.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('imatges').upload(fileName, imatgeFile);
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('imatges').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
}

async function guardarSortida(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const formMsg = document.getElementById('form-msg');
    const editId = document.getElementById('edit_id').value;
    submitBtn.disabled = true;
    submitBtn.innerText = "Processant...";
    try {
        let imatge_url = document.getElementById('imatge_actual').value || null;
        if (document.getElementById('imatge').files.length > 0) {
            imatge_url = await pujarImatge();
        }
        const dades = {
            titol: document.getElementById('titol').value,
            data: document.getElementById('data').value || null,
            descripcio: document.getElementById('descripcio').value,
            organitzador: document.getElementById('organitzador').value,
            web_track: document.getElementById('web_track').value,
            punt_sortida: document.getElementById('punt_sortida').value,
            provincia: document.getElementById('provincia').value,
            dificultat: document.getElementById('dificultat').value,
            imatge_url: imatge_url,
            user_id: currentUser.id
        };
        if (editId) {
            const { error } = await supabase.from('sortides').update(dades).eq('id', editId);
            if (error) throw error;
            formMsg.style.color = "#00bca5";
            formMsg.innerText = "Sortida actualitzada!";
        } else {
            const { error } = await supabase.from('sortides').insert([dades]);
            if (error) throw error;
            formMsg.style.color = "#00bca5";
            formMsg.innerText = "Sortida publicada!";
        }
        resetForm();
        carregarSortides();
    } catch (error) {
        formMsg.style.color = "#e53e3e";
        formMsg.innerText = "Error: " + error.message;
    } finally {
        submitBtn.disabled = false;
        setTimeout(() => formMsg.innerText = "", 4000);
    }
}

async function carregarSortides() {
    const llista = document.getElementById('llista-sortides');
    llista.innerHTML = "<p>Carregant sortides...</p>";
    const { data, error } = await supabase.from('sortides').select('*').order('created_at', { ascending: false });
    if (error) {
        llista.innerHTML = `<p style="color:red">Error al carregar: ${error.message}</p>`;
        return;
    }
    if (data.length === 0) {
        llista.innerHTML = "<p>No hi ha sortides publicades encara.</p>";
        return;
    }
    llista.innerHTML = '';
    const esGestor = currentUser.email === 'hola@gravelcatalunya.com';
    data.forEach(sortida => {
        const div = document.createElement('div');
        div.className = 'sortida-item';
        const potEditar = esGestor || currentUser.id === sortida.user_id;
        let html = `
            <div class="sortida-header">
                <div>
                    <div class="sortida-title">${sortida.titol}</div>
                    <div class="sortida-meta">Data: ${sortida.data || 'N/A'} | Província: ${sortida.provincia} | Dificultat: ${sortida.dificultat}</div>
                    <div class="sortida-meta">Org: ${sortida.organitzador} | <a href="${sortida.web_track}" target="_blank">Veure track</a></div>
                </div>
            </div>
            <p>${sortida.descripcio}</p>
        `;
        if (sortida.imatge_url) {
            html += `<img src="${sortida.imatge_url}" class="sortida-img" alt="Imatge sortida">`;
        }
        if (potEditar) {
            html += `
                <div class="sortida-actions">
                    <button class="btn-edit" onclick='prepararEdicio(${JSON.stringify(sortida).replace(/'/g, "&apos;")})'>Editar</button>
                    <button class="btn-delete" onclick="esborrarSortida('${sortida.id}')">Esborrar</button>
                </div>
            `;
        }
        div.innerHTML = html;
        llista.appendChild(div);
    });
}

function prepararEdicio(sortida) {
    document.getElementById('form-title').innerText = "Editar sortida";
    document.getElementById('edit_id').value = sortida.id;
    document.getElementById('titol').value = sortida.titol;
    document.getElementById('data').value = sortida.data || '';
    document.getElementById('descripcio').value = sortida.descripcio;
    document.getElementById('organitzador').value = sortida.organitzador;
    document.getElementById('web_track').value = sortida.web_track;
    document.getElementById('punt_sortida').value = sortida.punt_sortida || '';
    document.getElementById('provincia').value = sortida.provincia;
    document.getElementById('dificultat').value = sortida.dificultat;
    document.getElementById('imatge_actual').value = sortida.imatge_url || '';
    document.getElementById('submit-btn').innerText = "Desar canvis";
    document.getElementById('cancel-btn').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('sortida-form').reset();
    document.getElementById('form-title').innerText = "Nova sortida";
    document.getElementById('edit_id').value = '';
    document.getElementById('imatge_actual').value = '';
    document.getElementById('submit-btn').innerText = "Publicar sortida";
    document.getElementById('cancel-btn').classList.add('hidden');
}

async function esborrarSortida(id) {
    if(!confirm("Estàs segur que vols esborrar aquesta sortida?")) return;
    const { error } = await supabase.from('sortides').delete().eq('id', id);
    if (error) {
        alert("Error en esborrar: " + error.message);
    } else {
        carregarSortides();
    }
}

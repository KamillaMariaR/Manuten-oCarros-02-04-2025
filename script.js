/**
 * Represents a maintenance record (past or scheduled) for a vehicle.
 */
class Manutencao {
    /**
     * Creates an instance of Manutencao.
     * @param {string} data - The date of the maintenance (e.g., "YYYY-MM-DD" from date input).
     * @param {string} tipo - The type of service performed (e.g., "Troca de óleo").
     * @param {number | null} custo - The cost (null if scheduled, number if completed).
     * @param {string} [descricao=''] - An optional detailed description or observation.
     * @param {string | null} [hora=null] - The time of the maintenance (e.g., "HH:MM" from time input).
     * @param {string} [status='concluida'] - The status ('concluida' or 'agendada').
     */
    constructor(data, tipo, custo, descricao = '', hora = null, status = 'concluida') {
        this.data = data || ''; // Expecting YYYY-MM-DD format from input type="date"
        this.tipo = tipo || '';
        // If scheduled, cost should be null/0. If completed, it requires a number.
        this.custo = (status === 'agendada' || custo === null) ? null : (typeof custo === 'number' ? custo : 0);
        this.descricao = descricao || '';
        this.hora = hora || null; // Expecting HH:MM format from input type="time"
        this.status = (status === 'agendada') ? 'agendada' : 'concluida'; // Default to concluida
    }

    /**
     * Returns a Date object representing the scheduled/occurred date and time.
     * Returns null if data is invalid.
     * @returns {Date | null}
     */
    getDateTime() {
        if (!this.data || !/^\d{4}-\d{2}-\d{2}$/.test(this.data)) {
             // Basic check for YYYY-MM-DD format from input type="date"
            return null;
        }
        let dateString = this.data;
        if (this.hora && /^\d{2}:\d{2}$/.test(this.hora)) {
            dateString += `T${this.hora}:00`; // Append time if valid
        } else {
            // If scheduling without time, assume start of day? Or treat as just date?
            // For comparison, using midnight makes sense. For display, we might hide time.
             dateString += `T00:00:00`; // Use midnight if no time specified
        }
        try {
             // Try creating a Date object. May throw error for invalid dates like 2023-02-30
            const dt = new Date(dateString);
             // Check if the date is valid (Date constructor can be forgiving)
             // Re-extract parts and compare to ensure validity (e.g., avoids Feb 30 becoming Mar 2)
             const [year, month, day] = this.data.split('-').map(Number);
             // Check if parts match the created date object's parts
             if (dt.getFullYear() !== year || dt.getMonth() + 1 !== month || dt.getDate() !== day) {
                // If there's a mismatch, the date string was likely invalid (e.g., 2023-02-31)
                 return null; // Invalid date components
             }
              // Check if time parts match if time was provided
              if(this.hora) {
                const [hour, minute] = this.hora.split(':').map(Number);
                if (dt.getHours() !== hour || dt.getMinutes() !== minute) {
                    return null; // Invalid time components (less likely with T construct but safe)
                }
              }
            return dt;
        } catch (e) {
            console.error("Error parsing date/time:", dateString, e);
            return null; // Handle potential errors during Date parsing
        }
    }


    /**
     * Returns a formatted string representation of the maintenance record.
     * Differentiates between scheduled and completed maintenance.
     * @returns {string} Formatted maintenance information.
     */
    formatar() {
        const errosValidacao = this.validar();
         // Check if invalid, BUT allow scheduled items to be missing only cost validation
         if (errosValidacao.length > 0 && !(this.status === 'agendada' && errosValidacao.length === 1 && errosValidacao[0].includes('custo'))) {
             return `Dados de manutenção inválidos: ${errosValidacao.join(', ')}`;
         }


        // Format date nicely (DD/MM/YYYY)
        let dataFormatada = "Data inválida";
         const dateObj = this.getDateTime();
         if(dateObj) {
             dataFormatada = dateObj.toLocaleDateString('pt-BR', {
                 day: '2-digit', month: '2-digit', year: 'numeric'
             });
         }


        let info = '';
        if (this.status === 'agendada') {
            info = `Agendado: ${this.tipo} em ${dataFormatada}`;
            if (this.hora) {
                info += ` às ${this.hora}`;
            }
            if (this.descricao && this.descricao.trim() !== '') {
                info += ` (Obs: ${this.descricao})`;
            }
        } else { // status === 'concluida'
            const custoFormatado = (this.custo !== null && typeof this.custo === 'number') ? this.custo.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }) : 'Custo não informado';

            info = `- ${this.tipo} em ${dataFormatada} - ${custoFormatado}`;
            if (this.descricao && this.descricao.trim() !== '') {
                info += ` (${this.descricao})`;
            }
        }
        return info;
    }

    /**
     * Validates the maintenance data.
     * Checks date format, type presence, and cost (if completed).
     * @returns {string[]} An array of error messages. An empty array indicates the data is valid.
     */
    validar() {
        const erros = [];

        // 1. Validate Date (YYYY-MM-DD format and logical date using getDateTime)
        const dateObj = this.getDateTime();
        if (!dateObj) {
             // If getDateTime failed, it means data or hora was invalid or the combination resulted in an invalid Date
             if (!this.data || !/^\d{4}-\d{2}-\d{2}$/.test(this.data)) {
                 erros.push('Formato da data inválido (esperado AAAA-MM-DD).');
             } else if (this.hora && !/^\d{2}:\d{2}$/.test(this.hora)){
                 erros.push('Formato da hora inválido (esperado HH:MM).');
             } else {
                 erros.push('Data inválida (ex: Dia 31 em mês com 30 dias).');
             }
        }

        // 2. Validate Hora (Optional, format HH:MM is checked within getDateTime now)
        // No need for separate check here unless more specific validation is desired

        // 3. Validate Tipo (Non-empty string)
        if (typeof this.tipo !== 'string' || this.tipo.trim() === '') {
            erros.push('O tipo de serviço não pode ser vazio.');
        }

        // 4. Validate Custo (Non-negative number, *only* if status is 'concluida')
        if (this.status === 'concluida') {
            // Allow 0 cost, but not negative or non-numeric or null
            if (this.custo === null || typeof this.custo !== 'number' || isNaN(this.custo) || this.custo < 0) {
                erros.push('Para manutenção concluída, o custo deve ser um número igual ou maior que zero.');
            }
        }

        // 5. Validate Descricao (Optional, just check if it's a string if provided)
        if (this.descricao && typeof this.descricao !== 'string') {
             erros.push('A descrição/observação deve ser um texto.');
        }

        // 6. Validate Status
        if (this.status !== 'agendada' && this.status !== 'concluida') {
             erros.push('Status de manutenção inválido.');
        }


        return erros; // Return the array of errors
    }

    /**
     * Checks if the maintenance data is valid based on the `validar` method.
     * @returns {boolean} True if the data is valid, false otherwise.
     */
    isValid() {
        // Allow scheduled items to be valid even if cost validation fails (because cost *should* be null)
        const erros = this.validar();
         if (this.status === 'agendada') {
             // For scheduled, all errors *except* the one about cost must be absent
             return erros.filter(e => !e.includes('custo')).length === 0;
         } else {
             // For completed, there should be no errors at all
             return erros.length === 0;
         }
    }
}


// --- Veiculo Base Class ---
class Veiculo {
    constructor(modelo, cor) {
        this.modelo = modelo || "Não definido"; // Default values
        this.cor = cor || "Não definida";
        this.combustivel = 100;
        this.historicoManutencao = []; // Added maintenance history array
        this.nomeNaGaragem = null; // Will be set by Garagem
    }

    pintar(novaCor) {
        if (novaCor && typeof novaCor === 'string' && novaCor.trim() !== '') {
             this.cor = novaCor.trim();
             if (this.atualizarDetalhes) this.atualizarDetalhes(); // Check if method exists
             console.log(`Veículo pintado de ${this.cor}`);
             garagem.salvarGaragem(); // <-- SAVE GARAGE STATE
        } else {
            alert("Por favor, insira uma cor válida.");
        }
    }

    /**
     * Adds a maintenance record (past or scheduled) to the vehicle's history if valid.
     * @param {Manutencao} manutencao - The maintenance object to add.
     */
    adicionarManutencao(manutencao) {
        if (!(manutencao instanceof Manutencao)) {
            // Try to rehydrate if it's a plain object from storage
            if (typeof manutencao === 'object' && manutencao !== null && manutencao.data && manutencao.tipo) {
                 // Pass all potential properties including new ones
                manutencao = new Manutencao(
                    manutencao.data,
                    manutencao.tipo,
                    manutencao.custo,
                    manutencao.descricao,
                    manutencao.hora, // Add hora
                    manutencao.status // Add status
                );
            } else {
                 alert("Erro interno: Objeto de manutenção inválido.");
                 return false; // Indicate failure
            }
        }

        // Use the object's own validation method
        const erros = manutencao.validar();
        const isValidForAdding = manutencao.isValid(); // Use the refined isValid

        if (isValidForAdding) {
            this.historicoManutencao.push(manutencao);
            console.log(`Manutenção registrada/agendada: ${manutencao.formatar()}`);

            // Update UI displays
             if (this.nomeNaGaragem && typeof garagem !== 'undefined') {
                  // Update the main info display ONLY IF the currently displayed vehicle is this one
                  const infoArea = document.getElementById('informacoesVeiculo');
                  // Check if infoArea exists and if it currently displays this vehicle's model
                  if (infoArea && infoArea.textContent.includes(`Modelo: ${this.modelo}`)) {
                     garagem.exibirInformacoes(this.nomeNaGaragem);
                  }
                  // Always update the future appointments list
                  garagem.atualizarListaAgendamentos();
             }

             alert(`Manutenção ${manutencao.status === 'agendada' ? 'agendada' : 'adicionada'} com sucesso!`);
             garagem.salvarGaragem(); // <-- SAVE GARAGE STATE
             return true; // Indicate success
        } else {
            alert(`Erro ao ${manutencao.status === 'agendada' ? 'agendar' : 'adicionar'} manutenção:\n` + erros.join("\n"));
            return false; // Indicate failure
        }
    }

    exibirInformacoes() {
        let info = `Modelo: ${this.modelo}\nCor: ${this.cor}\nCombustível: ${this.combustivel}%`; // Changed to %

        // Add **Completed** Maintenance History
        info += "\n\n--- Histórico de Manutenção Realizada ---";
        const historicoCompleto = (this.historicoManutencao || [])
             .map(m => (m instanceof Manutencao) ? m : new Manutencao(m.data, m.tipo, m.custo, m.descricao, m.hora, m.status)) // Rehydrate just in case
             .filter(m => m.status === 'concluida'); // Filter for COMPLETED

        const historicoCompletoValido = historicoCompleto.filter(m => m.isValid());

        if (historicoCompletoValido.length === 0) {
            info += "\nNenhuma manutenção realizada registrada.";
             if (historicoCompleto.length > historicoCompletoValido.length) {
                 info += "\n(Existem registros concluídos com dados inválidos)";
             }
        } else {
             // Sort history by date (most recent first)
             historicoCompletoValido.sort((a, b) => {
                 const dateA = a.getDateTime();
                 const dateB = b.getDateTime();
                 if (!dateA && !dateB) return 0;
                 if (!dateA) return 1; // Put invalid dates last
                 if (!dateB) return -1;
                 return dateB - dateA; // Descending order (most recent first)
             });

            historicoCompletoValido.forEach(m => {
                info += `\n${m.formatar()}`;
            });

            if (historicoCompleto.length > historicoCompletoValido.length) {
                 info += "\n\n(Alguns registros concluídos não puderam ser exibidos devido a dados inválidos)";
             }
        }
        // Note: Scheduled items are NOT displayed here anymore, they are in their own list.
        return info;
    }

    // --- Placeholder UI Update Methods (to be implemented by subclasses) ---
    atualizarDetalhes() { /* Implement in subclass */ }
    atualizarStatus() { /* Implement in subclass */ }
    atualizarVelocidadeDisplay() { /* Implement in subclass */ }
    atualizarPonteiroVelocidade() { /* Implement in subclass */ }
    atualizarInfoDisplay() { /* Implement in subclass */ }
    ativarAnimacaoAceleracao(tipo) { /* Implement in subclass or make generic */ }
    ativarAnimacaoFreagem(tipo) { /* Implement in subclass or make generic */ }
}

// --- Car Class ---
class Carro extends Veiculo {
    constructor(modelo, cor) {
        super(modelo, cor);
        this.ligado = false;
        this.velocidade = 0;
        this.velocidadeMaxima = 200;
        // nomeNaGaragem will be set by Garagem
    }

    ligar() {
        if (this.ligado) return;
        if (this.combustivel > 0) {
            this.ligado = true;
            this.atualizarStatus();
            console.log("Carro ligado!");
            garagem.salvarGaragem(); // <-- SAVE
        } else {
            alert("Sem combustível! Abasteça o carro.");
        }
    }

    desligar() {
        if (!this.ligado) return;

        const previouslyLigado = this.ligado;
        this.ligado = false;

        if (this.velocidade > 0) {
             const interval = setInterval(() => {
                 this.frear(true); // Pass flag to indicate internal call from desligar
                 if (this.velocidade === 0) {
                    clearInterval(interval);
                    this.atualizarStatus();
                    this.atualizarVelocidadeDisplay();
                    this.atualizarPonteiroVelocidade();
                     console.log("Carro desligado após parar.");
                     garagem.salvarGaragem(); // <-- SAVE after stopping
                 }
             }, 100); // Adjust interval time as needed
        } else {
            this.atualizarStatus();
             this.atualizarVelocidadeDisplay();
             this.atualizarPonteiroVelocidade();
             console.log("Carro desligado.");
             if(previouslyLigado) garagem.salvarGaragem(); // <-- SAVE only if it was actually turned off now
        }
    }

    acelerar() {
        if (!this.ligado) {
            alert("Ligue o carro primeiro!");
            return;
        }
        if (this.combustivel <= 0) {
             alert("Sem combustível! Abasteça o carro.");
             this.desligar();
             return;
        }
        if (this.velocidade >= this.velocidadeMaxima) {
             this.velocidade = this.velocidadeMaxima;
             this.atualizarVelocidadeDisplay();
             this.atualizarPonteiroVelocidade();
            return; // Already at max speed
        }

        this.velocidade = Math.min(this.velocidade + 10, this.velocidadeMaxima);
        this.combustivel = Math.max(this.combustivel - 5, 0); // Consume fuel
        this.atualizarVelocidadeDisplay();
        this.atualizarPonteiroVelocidade();
        this.ativarAnimacaoAceleracao('carro'); // 'carro' is the type prefix for IDs
        console.log(`Acelerando! Velocidade: ${this.velocidade}, Combustível: ${this.combustivel}%`);
        garagem.salvarGaragem(); // <-- SAVE state change

        if (this.combustivel <= 0) {
            console.log("Sem combustível! O carro vai desligar.");
            this.desligar(); // Desligar will handle saving after stopping
        }
    }

    frear(interno = false) { // Add flag to know if called internally (e.g., by desligar)
        if (this.velocidade === 0) {
             const frearBtn = document.getElementById(`frear-btn`); // Use correct ID
             if (frearBtn) frearBtn.disabled = true;
            return; // Cannot brake if already stopped
        }

        this.velocidade = Math.max(this.velocidade - 10, 0); // Decrease speed
        this.atualizarVelocidadeDisplay();
        this.atualizarPonteiroVelocidade();
        if (!interno) this.ativarAnimacaoFreagem('carro'); // Don't show animation if called by desligar
        console.log(`Freando! Velocidade: ${this.velocidade}`);
        if (!interno) garagem.salvarGaragem(); // <-- SAVE state change only if user action

        // If stopped and the car is supposed to be off (due to desligar call), update status
        if(this.velocidade === 0 && !this.ligado) {
             this.atualizarStatus();
        }
    }

     atualizarStatus() {
        // Use the specific ID for this vehicle type's buttons container if needed, or general IDs
        const statusElement = document.getElementById(`carro-status`);
        const ligarBtn = document.getElementById(`ligar-btn`);
        const desligarBtn = document.getElementById(`desligar-btn`);
        const acelerarBtn = document.getElementById('acelerar-btn');
        const frearBtn = document.getElementById('frear-btn');
        const pintarBtn = document.getElementById('pintar-btn');
        const abastecerBtn = document.getElementById('abastecer-btn');

        if (statusElement) {
            statusElement.textContent = this.ligado ? 'Ligado' : 'Desligado';
            statusElement.style.color = this.ligado ? 'green' : 'red';
        }

        if (ligarBtn) ligarBtn.disabled = this.ligado;
        if (desligarBtn) desligarBtn.disabled = !this.ligado;
        if (acelerarBtn) acelerarBtn.disabled = !this.ligado;
        if (frearBtn) frearBtn.disabled = this.velocidade === 0;
        if (pintarBtn) pintarBtn.disabled = false; // Can always paint
        if (abastecerBtn) abastecerBtn.disabled = false; // Can always refuel
    }

     atualizarVelocidadeDisplay() {
        const velocidadeElement = document.getElementById(`velocidade-valor`);
        if (velocidadeElement) {
            velocidadeElement.textContent = this.velocidade + " km/h";
        }
         const frearBtn = document.getElementById('frear-btn');
         if (frearBtn) frearBtn.disabled = this.velocidade === 0;
    }

     atualizarPonteiroVelocidade() {
        const ponteiro = document.getElementById(`ponteiro-velocidade`);
        if (ponteiro) {
            const porcentagem = Math.min((this.velocidade / this.velocidadeMaxima) * 100, 100);
            ponteiro.style.width = `${porcentagem}%`;
        }
    }

     atualizarDetalhes() {
        const modeloElement = document.getElementById(`modelo`); // Use the correct ID from HTML
        const corElement = document.getElementById(`cor`);     // Use the correct ID from HTML
        if (modeloElement) modeloElement.textContent = this.modelo;
        if (corElement) corElement.textContent = this.cor;
    }

    atualizarInfoDisplay() {
        // Base car doesn't have a specific info paragraph like turbo/cargo
    }


     exibirInformacoes() {
        let baseInfo = super.exibirInformacoes();
        return `${baseInfo}\nLigado: ${this.ligado ? 'Sim' : 'Não'}\nVelocidade: ${this.velocidade} km/h`;
    }

    // --- Animation Helper Methods (Generic) ---
    ativarAnimacaoAceleracao(tipo) { // tipo should be 'carro', 'carroEsportivo', etc.
        const animacaoAceleracao = document.getElementById(`animacao-aceleracao-${tipo}`);
        if (animacaoAceleracao) {
            animacaoAceleracao.classList.add('ativa');
            setTimeout(() => {
                animacaoAceleracao.classList.remove('ativa');
            }, 300); // Match CSS transition
        }
    }

    ativarAnimacaoFreagem(tipo) {
        const animacaoFreagem = document.getElementById(`animacao-freagem-${tipo}`);
        if (animacaoFreagem) {
            animacaoFreagem.classList.add('ativa');
            setTimeout(() => {
                animacaoFreagem.classList.remove('ativa');
            }, 300);
        }
    }
}


// --- Sports Car Class ---
class CarroEsportivo extends Carro {
    constructor(modelo, cor) {
        super(modelo, cor);
        this.turboAtivado = false;
        this.velocidadeMaxima = 300; // Higher max speed
    }

    ativarTurbo() {
        if (!this.ligado) return alert("Ligue o carro esportivo primeiro!");
        if (this.turboAtivado) return;
        if (this.combustivel < 20) return alert("Combustível baixo demais para ativar o turbo!");

        this.turboAtivado = true;
        console.log('Turbo Ativado!');
        alert('Turbo Ativado!');
        this.atualizarInfoDisplay();
        this.atualizarStatus();
        garagem.salvarGaragem(); // <-- SAVE
    }

    desativarTurbo() {
         if (!this.turboAtivado) return;
        this.turboAtivado = false;
        console.log('Turbo Desativado!');
        alert('Turbo Desativado!');
         this.atualizarInfoDisplay();
         this.atualizarStatus();
         garagem.salvarGaragem(); // <-- SAVE
    }

    acelerar() {
        if (!this.ligado) return alert("Ligue o carro esportivo primeiro!");
        if (this.combustivel <= 0) { this.desligar(); return alert("Sem combustível! Abasteça o carro."); }
        if (this.velocidade >= this.velocidadeMaxima) { this.velocidade = this.velocidadeMaxima; this.atualizarVelocidadeDisplay(); this.atualizarPonteiroVelocidade(); return; }

        const aumento = this.turboAtivado ? 50 : 20;
        const consumo = this.turboAtivado ? 15 : 10;

        this.velocidade = Math.min(this.velocidade + aumento, this.velocidadeMaxima);
        this.combustivel = Math.max(this.combustivel - consumo, 0);

        this.atualizarVelocidadeDisplay();
        this.atualizarPonteiroVelocidade();
        this.ativarAnimacaoAceleracao('carroEsportivo'); // Use correct type prefix
        console.log(`Acelerando Carro Esportivo (Turbo: ${this.turboAtivado})! Vel: ${this.velocidade}, Comb: ${this.combustivel}%`);
        garagem.salvarGaragem(); // <-- SAVE

        if (this.combustivel <= 0) {
            console.log("Sem combustível! O carro vai desligar.");
             if (this.turboAtivado) this.desativarTurbo(); // Save is handled in desativarTurbo
            this.desligar(); // Save is handled in desligar
        }
    }

    frear(interno = false) {
         if (this.velocidade === 0) {
             const frearBtn = document.getElementById('frear-carroEsportivo-btn'); // Use correct ID
             if (frearBtn) frearBtn.disabled = true;
             return;
         }
        this.velocidade = Math.max(this.velocidade - 20, 0); // Brakes harder
        this.atualizarVelocidadeDisplay();
        this.atualizarPonteiroVelocidade();
        if(!interno) this.ativarAnimacaoFreagem('carroEsportivo');
        console.log(`Freando Carro Esportivo! Velocidade: ${this.velocidade}`);
        if (!interno) garagem.salvarGaragem(); // <-- SAVE

         if(this.velocidade === 0 && !this.ligado) {
             this.atualizarStatus();
        }
    }

     atualizarStatus() {
        const statusElement = document.getElementById(`carroEsportivo-status`);
        const ligarBtn = document.getElementById(`ligar-carroEsportivo-btn`);
        const desligarBtn = document.getElementById(`desligar-carroEsportivo-btn`);
        const acelerarBtn = document.getElementById('acelerar-carroEsportivo-btn');
        const frearBtn = document.getElementById('frear-carroEsportivo-btn');
        const pintarBtn = document.getElementById('pintar-carroEsportivo-btn');
        const abastecerBtn = document.getElementById('abastecer-carroEsportivo-btn');
        // Find turbo buttons using unique part of their onclick handler
        const turboOnBtn = document.querySelector('#botoes-carroEsportivo button[onclick*="ativarTurbo"]');
        const turboOffBtn = document.querySelector('#botoes-carroEsportivo button[onclick*="desativarTurbo"]');

        if (statusElement) {
            statusElement.textContent = this.ligado ? 'Ligado' : 'Desligado';
            statusElement.style.color = this.ligado ? 'green' : 'red';
        }

        if (ligarBtn) ligarBtn.disabled = this.ligado;
        if (desligarBtn) desligarBtn.disabled = !this.ligado;
        if (acelerarBtn) acelerarBtn.disabled = !this.ligado;
        if (frearBtn) frearBtn.disabled = this.velocidade === 0;
        if (pintarBtn) pintarBtn.disabled = false;
        if (abastecerBtn) abastecerBtn.disabled = false;
        if (turboOnBtn) turboOnBtn.disabled = !this.ligado || this.turboAtivado || this.combustivel < 20;
        if (turboOffBtn) turboOffBtn.disabled = !this.ligado || !this.turboAtivado;
    }

     atualizarVelocidadeDisplay() {
        const velocidadeElement = document.getElementById(`carroEsportivo-velocidade-valor`);
        if (velocidadeElement) {
            velocidadeElement.textContent = this.velocidade + " km/h";
        }
         const frearBtn = document.getElementById('frear-carroEsportivo-btn');
         if (frearBtn) frearBtn.disabled = this.velocidade === 0;
    }

     atualizarPonteiroVelocidade() {
        const ponteiro = document.getElementById(`ponteiro-carroEsportivo-velocidade`);
         if (ponteiro) {
             const porcentagem = Math.min((this.velocidade / this.velocidadeMaxima) * 100, 100);
             ponteiro.style.width = `${porcentagem}%`;
         }
    }

     atualizarDetalhes() {
        const modeloElement = document.getElementById(`carroEsportivo-modelo`);
        const corElement = document.getElementById(`carroEsportivo-cor`);
        if (modeloElement) modeloElement.textContent = this.modelo;
        if (corElement) corElement.textContent = this.cor;
    }

      atualizarInfoDisplay() {
         const infoElement = document.getElementById('infoEsportivo'); // Specific ID for sports car info
         if (infoElement) {
             infoElement.textContent = `Turbo: ${this.turboAtivado ? 'Ativado' : 'Desativado'}`;
         }
     }

     exibirInformacoes() {
        let baseInfo = super.exibirInformacoes();
        return `${baseInfo}\nTurbo: ${this.turboAtivado ? 'Ativado' : 'Desativado'}`;
    }
}


// --- Truck Class ---
class Caminhao extends Carro {
    constructor(modelo, cor, capacidadeCarga) {
        super(modelo, cor);
        this.capacidadeCarga = (!isNaN(capacidadeCarga) && capacidadeCarga > 0) ? capacidadeCarga : 1000;
        this.cargaAtual = 0;
        this.velocidadeMaxima = 120; // Lower max speed
    }

    carregar(peso) {
         const pesoNumerico = parseInt(peso, 10);
         if (isNaN(pesoNumerico) || pesoNumerico <= 0) return alert("Por favor, insira um peso válido (número positivo) para carregar.");
         if (this.cargaAtual + pesoNumerico > this.capacidadeCarga) return alert(`Carga excede a capacidade máxima de ${this.capacidadeCarga} kg! Carga atual: ${this.cargaAtual} kg.`);

        this.cargaAtual += pesoNumerico;
        this.atualizarDetalhes(); // Update display of current load
        this.atualizarInfoDisplay(); // Update the specific info paragraph
        console.log(`Caminhão carregado com ${pesoNumerico}kg. Carga atual: ${this.cargaAtual}kg`);
        alert(`Caminhão carregado. Carga atual: ${this.cargaAtual}kg`);
        garagem.salvarGaragem(); // <-- SAVE
    }

    descarregar(peso) {
        const pesoNumerico = parseInt(peso, 10);
         if (isNaN(pesoNumerico) || pesoNumerico <= 0) return alert("Por favor, insira um peso válido (número positivo) para descarregar.");
         if (pesoNumerico > this.cargaAtual) return alert(`Não é possível descarregar ${pesoNumerico}kg. Carga atual: ${this.cargaAtual}kg.`);

        this.cargaAtual -= pesoNumerico;
        this.atualizarDetalhes();
        this.atualizarInfoDisplay();
        console.log(`Caminhão descarregado em ${pesoNumerico}kg. Carga atual: ${this.cargaAtual}kg`);
         alert(`Caminhão descarregado. Carga atual: ${this.cargaAtual}kg`);
         garagem.salvarGaragem(); // <-- SAVE
    }

     acelerar() {
         if (!this.ligado) return alert("Ligue o caminhão primeiro!");
         if (this.combustivel <= 0) { this.desligar(); return alert("Sem combustível! Abasteça o caminhão."); }
         if (this.velocidade >= this.velocidadeMaxima) { this.velocidade = this.velocidadeMaxima; this.atualizarVelocidadeDisplay(); this.atualizarPonteiroVelocidade(); return; }

         const fatorCarga = 1 - (this.cargaAtual / (this.capacidadeCarga * 2));
         const aumento = Math.max(5, 10 * fatorCarga);
         const consumo = 8 + (this.cargaAtual / this.capacidadeCarga) * 4;

         this.velocidade = Math.min(this.velocidade + aumento, this.velocidadeMaxima);
         this.combustivel = Math.max(this.combustivel - consumo, 0);
         this.atualizarVelocidadeDisplay();
         this.atualizarPonteiroVelocidade();
         this.ativarAnimacaoAceleracao('caminhao');
         console.log(`Acelerando Caminhão! Vel: ${this.velocidade.toFixed(1)}, Comb: ${this.combustivel.toFixed(1)}%, Carga: ${this.cargaAtual}kg`);
         garagem.salvarGaragem(); // <-- SAVE

         if (this.combustivel <= 0) {
             console.log("Sem combustível! O caminhão vai desligar.");
             this.desligar(); // Save handled by desligar
         }
     }

     frear(interno = false) {
          if (this.velocidade === 0) {
              const frearBtn = document.getElementById('frear-caminhao-btn'); // Use correct ID
              if (frearBtn) frearBtn.disabled = true;
              return;
          }
         const fatorCarga = 1 + (this.cargaAtual / this.capacidadeCarga);
         const reducao = Math.max(10 / fatorCarga, 2);

         this.velocidade = Math.max(this.velocidade - reducao, 0);
         this.atualizarVelocidadeDisplay();
         this.atualizarPonteiroVelocidade();
         if(!interno) this.ativarAnimacaoFreagem('caminhao');
         console.log(`Freando Caminhão! Velocidade: ${this.velocidade.toFixed(1)}`);
        if (!interno) garagem.salvarGaragem(); // <-- SAVE

          if(this.velocidade === 0 && !this.ligado) {
             this.atualizarStatus();
         }
     }

      atualizarStatus() {
        const statusElement = document.getElementById(`caminhao-status`);
        const ligarBtn = document.getElementById(`ligar-caminhao-btn`);
        const desligarBtn = document.getElementById(`desligar-caminhao-btn`);
        const acelerarBtn = document.getElementById('acelerar-caminhao-btn');
        const frearBtn = document.getElementById('frear-caminhao-btn');
        const pintarBtn = document.getElementById('pintar-caminhao-btn');
        const abastecerBtn = document.getElementById('abastecer-caminhao-btn');
        const carregarBtn = document.querySelector('#botoes-caminhao button[onclick*="carregar"]');
        const descarregarBtn = document.querySelector('#botoes-caminhao button[onclick*="descarregar"]');

         if (statusElement) {
            statusElement.textContent = this.ligado ? 'Ligado' : 'Desligado';
            statusElement.style.color = this.ligado ? 'green' : 'red';
        }

        if (ligarBtn) ligarBtn.disabled = this.ligado;
        if (desligarBtn) desligarBtn.disabled = !this.ligado;
        if (acelerarBtn) acelerarBtn.disabled = !this.ligado;
        if (frearBtn) frearBtn.disabled = this.velocidade === 0;
        if (pintarBtn) pintarBtn.disabled = false;
        if (abastecerBtn) abastecerBtn.disabled = false;
        // Keep load/unload always enabled for simplicity, could disable if moving
        if(carregarBtn) carregarBtn.disabled = false;
        if(descarregarBtn) descarregarBtn.disabled = false;
    }

     atualizarVelocidadeDisplay() {
        const velocidadeElement = document.getElementById(`caminhao-velocidade-valor`);
        if (velocidadeElement) {
            velocidadeElement.textContent = this.velocidade.toFixed(1) + " km/h";
        }
        const frearBtn = document.getElementById('frear-caminhao-btn');
        if (frearBtn) frearBtn.disabled = this.velocidade === 0;
    }

     atualizarPonteiroVelocidade() {
        const ponteiro = document.getElementById(`ponteiro-caminhao-velocidade`);
         if (ponteiro) {
            const porcentagem = Math.min((this.velocidade / this.velocidadeMaxima) * 100, 100);
            ponteiro.style.width = `${porcentagem}%`;
         }
    }

     atualizarDetalhes() {
         const modeloElement = document.getElementById(`caminhao-modelo`);
         const corElement = document.getElementById(`caminhao-cor`);
         const cargaElement = document.getElementById(`caminhao-carga`); // Specific element for cargo

         if (modeloElement) modeloElement.textContent = this.modelo;
         if (corElement) corElement.textContent = this.cor;
         if (cargaElement) cargaElement.textContent = `${this.cargaAtual}kg / ${this.capacidadeCarga}kg`;
    }

      atualizarInfoDisplay() {
         const infoElement = document.getElementById('infoCaminhao'); // Specific ID for truck info
         if (infoElement) {
             infoElement.textContent = `Carga Atual: ${this.cargaAtual}kg (Capacidade: ${this.capacidadeCarga}kg)`;
         }
     }

     exibirInformacoes() {
        let baseInfo = super.exibirInformacoes();
        return `${baseInfo}\nCarga: ${this.cargaAtual}kg / ${this.capacidadeCarga}kg`;
    }
}


// --- Motorcycle Class ---
class Moto extends Carro {
    constructor(modelo, cor) {
        super(modelo, cor);
        this.velocidadeMaxima = 180; // Different max speed
    }

    ligar() {
         if (this.ligado) return;
        if (this.combustivel > 0) {
            this.ligado = true;
            this.atualizarStatus();
            console.log("Moto ligada! Vrumm!");
            garagem.salvarGaragem(); // <-- SAVE
        } else {
            alert("Sem combustível! Abasteça a moto.");
        }
    }

    desligar() {
        if (!this.ligado) return;
         const previouslyLigado = this.ligado;
        this.ligado = false;
        if (this.velocidade > 0) {
             const interval = setInterval(() => {
                 this.frear(true); // Pass internal flag
                 if (this.velocidade === 0) {
                    clearInterval(interval);
                    this.atualizarStatus();
                    this.atualizarVelocidadeDisplay();
                    this.atualizarPonteiroVelocidade();
                    console.log("Moto desligada após parar.");
                    garagem.salvarGaragem(); // <-- SAVE
                 }
             }, 80);
        } else {
            this.atualizarStatus();
            this.atualizarVelocidadeDisplay();
            this.atualizarPonteiroVelocidade();
            console.log("Moto desligada.");
             if(previouslyLigado) garagem.salvarGaragem(); // <-- SAVE
        }
    }

    acelerar() {
        if (!this.ligado) return alert("Ligue a moto primeiro!");
        if (this.combustivel <= 0) { this.desligar(); return alert("Sem combustível! Abasteça a moto."); }
        if (this.velocidade >= this.velocidadeMaxima) { this.velocidade = this.velocidadeMaxima; this.atualizarVelocidadeDisplay(); this.atualizarPonteiroVelocidade(); return; }

        this.velocidade = Math.min(this.velocidade + 15, this.velocidadeMaxima);
        this.combustivel = Math.max(this.combustivel - 3, 0); // More fuel efficient?
        this.atualizarVelocidadeDisplay();
        this.atualizarPonteiroVelocidade();
        this.ativarAnimacaoAceleracao('moto');
        console.log(`Acelerando a moto! Vel: ${this.velocidade}, Comb: ${this.combustivel}%`);
        garagem.salvarGaragem(); // <-- SAVE

        if (this.combustivel <= 0) {
            console.log("Sem combustível! A moto vai desligar.");
            this.desligar(); // Save handled by desligar
        }
    }

    frear(interno = false) {
        if (this.velocidade === 0) {
            const frearBtn = document.getElementById('frear-moto-btn'); // Use correct ID
            if (frearBtn) frearBtn.disabled = true;
            return;
        }
        this.velocidade = Math.max(this.velocidade - 15, 0);
        this.atualizarVelocidadeDisplay();
        this.atualizarPonteiroVelocidade();
         if(!interno) this.ativarAnimacaoFreagem('moto');
         console.log(`Freando Moto! Velocidade: ${this.velocidade}`);
        if (!interno) garagem.salvarGaragem(); // <-- SAVE

         if(this.velocidade === 0 && !this.ligado) {
             this.atualizarStatus();
         }
    }

    atualizarStatus() {
        const statusElement = document.getElementById(`moto-status`);
        const ligarBtn = document.getElementById(`ligar-moto-btn`);
        const desligarBtn = document.getElementById(`desligar-moto-btn`);
        const acelerarBtn = document.getElementById('acelerar-moto-btn');
        const frearBtn = document.getElementById('frear-moto-btn');
        const pintarBtn = document.getElementById('pintar-moto-btn');
        const abastecerBtn = document.getElementById('abastecer-moto-btn');

        if (statusElement) {
            statusElement.textContent = this.ligado ? 'Ligada' : 'Desligada'; // Specific text
            statusElement.style.color = this.ligado ? 'green' : 'red';
        }

        if (ligarBtn) ligarBtn.disabled = this.ligado;
        if (desligarBtn) desligarBtn.disabled = !this.ligado;
        if (acelerarBtn) acelerarBtn.disabled = !this.ligado;
        if (frearBtn) frearBtn.disabled = this.velocidade === 0;
        if (pintarBtn) pintarBtn.disabled = false;
        if (abastecerBtn) abastecerBtn.disabled = false;
    }

     atualizarVelocidadeDisplay() {
        const velocidadeElement = document.getElementById(`moto-velocidade-valor`);
        if (velocidadeElement) {
            velocidadeElement.textContent = this.velocidade + " km/h";
        }
         const frearBtn = document.getElementById('frear-moto-btn');
         if (frearBtn) frearBtn.disabled = this.velocidade === 0;
    }

     atualizarPonteiroVelocidade() {
        const ponteiro = document.getElementById(`ponteiro-moto-velocidade`);
         if (ponteiro) {
            const porcentagem = Math.min((this.velocidade / this.velocidadeMaxima) * 100, 100);
            ponteiro.style.width = `${porcentagem}%`;
         }
    }

     atualizarDetalhes() {
        const modeloElement = document.getElementById(`moto-modelo`);
        const corElement = document.getElementById(`moto-cor`);
        if (modeloElement) modeloElement.textContent = this.modelo;
        if (corElement) corElement.textContent = this.cor;
    }

      atualizarInfoDisplay() {
         const infoElement = document.getElementById('infoMoto');
         if (infoElement) {
             infoElement.textContent = ''; // No extra info for moto
         }
     }


     exibirInformacoes() {
        // Call the *base* Veiculo method to get model/color/fuel + COMPLETED maintenance
        let baseInfo = Veiculo.prototype.exibirInformacoes.call(this);
        return `${baseInfo}\nStatus: ${this.ligado ? 'Ligada' : 'Desligada'}\nVelocidade: ${this.velocidade} km/h`;
    }
}


// --- Garage Class ---
class Garagem {
    constructor() {
        this.veiculos = {};
        this.localStorageKey = 'dadosGaragemCompleta_v2'; // v2 includes new Manutencao fields
        this.carregarGaragem(); // Attempt to load data immediately
    }

    // --- Persistence Methods ---

    salvarGaragem() {
        const dadosParaSalvar = {};
        for (const nomeVeiculo in this.veiculos) {
            if (this.veiculos.hasOwnProperty(nomeVeiculo)) {
                const veiculo = this.veiculos[nomeVeiculo];
                dadosParaSalvar[nomeVeiculo] = {
                    tipo: veiculo.constructor.name,
                    modelo: veiculo.modelo,
                    cor: veiculo.cor,
                    combustivel: veiculo.combustivel,
                    historicoManutencao: veiculo.historicoManutencao.map(m => ({
                        data: m.data,
                        tipo: m.tipo,
                        custo: m.custo,
                        descricao: m.descricao,
                        hora: m.hora,    // SAVE hora
                        status: m.status // SAVE status
                    })),
                    ligado: veiculo.ligado,
                    velocidade: veiculo.velocidade,
                    velocidadeMaxima: veiculo.velocidadeMaxima,
                    // Add type-specific properties
                    ...(veiculo instanceof CarroEsportivo && { turboAtivado: veiculo.turboAtivado }),
                    ...(veiculo instanceof Caminhao && {
                        capacidadeCarga: veiculo.capacidadeCarga,
                        cargaAtual: veiculo.cargaAtual
                    }),
                };
            }
        }
        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(dadosParaSalvar));
            console.log(`Garagem salva (key: ${this.localStorageKey}).`);
        } catch (error) {
            console.error("Erro ao salvar garagem:", error);
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                alert("Erro: Limite de armazenamento local excedido.");
            }
        }
    }

    carregarGaragem() {
        const dadosSalvos = localStorage.getItem(this.localStorageKey);
        if (!dadosSalvos) {
            console.log(`Nenhum dado salvo (key: ${this.localStorageKey}).`);
            return false;
        }

        try {
            const dadosParseados = JSON.parse(dadosSalvos);
            this.veiculos = {}; // Clear current before loading

            for (const nomeVeiculo in dadosParseados) {
                if (dadosParseados.hasOwnProperty(nomeVeiculo)) {
                    const dadosVeiculo = dadosParseados[nomeVeiculo];
                    let novoVeiculo = null;

                    switch (dadosVeiculo.tipo) {
                        case 'Carro':
                            novoVeiculo = new Carro(dadosVeiculo.modelo, dadosVeiculo.cor);
                            break;
                        case 'CarroEsportivo':
                            novoVeiculo = new CarroEsportivo(dadosVeiculo.modelo, dadosVeiculo.cor);
                             if (novoVeiculo && dadosVeiculo.hasOwnProperty('turboAtivado')) {
                                novoVeiculo.turboAtivado = dadosVeiculo.turboAtivado;
                            }
                            break;
                        case 'Caminhao':
                            novoVeiculo = new Caminhao(dadosVeiculo.modelo, dadosVeiculo.cor, dadosVeiculo.capacidadeCarga);
                             if (novoVeiculo && dadosVeiculo.hasOwnProperty('cargaAtual')) {
                                novoVeiculo.cargaAtual = dadosVeiculo.cargaAtual;
                            }
                            break;
                        case 'Moto':
                            novoVeiculo = new Moto(dadosVeiculo.modelo, dadosVeiculo.cor);
                            break;
                        default:
                            console.warn(`Tipo desconhecido "${dadosVeiculo.tipo}" para ${nomeVeiculo}.`);
                            continue;
                    }

                    if (novoVeiculo) {
                        // Restore common and inherited properties
                        novoVeiculo.combustivel = typeof dadosVeiculo.combustivel === 'number' ? dadosVeiculo.combustivel : 100;
                        novoVeiculo.ligado = dadosVeiculo.ligado || false;
                        novoVeiculo.velocidade = dadosVeiculo.velocidade || 0;
                        novoVeiculo.velocidadeMaxima = dadosVeiculo.velocidadeMaxima || (novoVeiculo instanceof Moto ? 180 : (novoVeiculo instanceof Caminhao ? 120 : (novoVeiculo instanceof CarroEsportivo ? 300 : 200))); // Default Vmax based on type

                        // Rehydrate historicoManutencao
                        if (Array.isArray(dadosVeiculo.historicoManutencao)) {
                            novoVeiculo.historicoManutencao = dadosVeiculo.historicoManutencao.map(
                                m => new Manutencao(
                                    m.data, m.tipo, m.custo, m.descricao,
                                    m.hora, // LOAD hora
                                    m.status // LOAD status
                                )
                            );
                        } else {
                            novoVeiculo.historicoManutencao = [];
                        }

                         novoVeiculo.nomeNaGaragem = nomeVeiculo; // Assign the internal name
                        this.veiculos[nomeVeiculo] = novoVeiculo;
                    }
                }
            }
            console.log(`Garagem (key: ${this.localStorageKey}) carregada.`);
            return true;

        } catch (error) {
            console.error(`Erro ao carregar/parsear garagem (key: ${this.localStorageKey}):`, error);
            localStorage.removeItem(this.localStorageKey); // Clear corrupt data
            alert("Erro ao carregar dados da garagem. Dados corrompidos foram removidos.");
            this.veiculos = {};
            return false;
        }
    }

    /** Updates the entire UI based on the current state of all vehicles. */
    atualizarUICompleta() {
         console.log("Atualizando UI completa...");
         for (const nomeVeiculo in this.veiculos) {
              if (this.veiculos.hasOwnProperty(nomeVeiculo)) {
                   const veiculo = this.veiculos[nomeVeiculo];
                   console.log(`Atualizando UI para: ${nomeVeiculo}`);
                   if (veiculo.atualizarDetalhes) veiculo.atualizarDetalhes();
                   if (veiculo.atualizarStatus) veiculo.atualizarStatus();
                   if (veiculo.atualizarVelocidadeDisplay) veiculo.atualizarVelocidadeDisplay();
                   if (veiculo.atualizarPonteiroVelocidade) veiculo.atualizarPonteiroVelocidade();
                   if (veiculo.atualizarInfoDisplay) veiculo.atualizarInfoDisplay();
                   this.preencherInputsVeiculo(nomeVeiculo, veiculo);
              }
         }
          // Update the main info display (show first vehicle or default message)
          const primeiroNome = Object.keys(this.veiculos)[0];
          const infoArea = document.getElementById('informacoesVeiculo');
          if(primeiroNome && infoArea) {
              this.exibirInformacoes(primeiroNome);
          } else if (infoArea) {
               infoArea.textContent = "Nenhum veículo na garagem. Crie ou atualize um veículo acima.";
          }
          // Update scheduled list
          this.atualizarListaAgendamentos();
    }

     /** Helper to pre-fill inputs based on loaded data */
     preencherInputsVeiculo(nome, veiculo) {
          let idSuffix = '';
          if (nome === 'meuCarro') idSuffix = 'Carro';
          else if (nome === 'carroEsportivo') idSuffix = 'Esportivo';
          else if (nome === 'caminhao') idSuffix = 'Caminhao';
          else if (nome === 'moto') idSuffix = 'Moto';
          else return;

         const modeloInput = document.getElementById(`modelo${idSuffix}`);
         const corInput = document.getElementById(`cor${idSuffix}`);

         if (modeloInput && veiculo.modelo) modeloInput.value = veiculo.modelo;
         if (corInput && veiculo.cor) corInput.value = veiculo.cor;

         if (nome === 'caminhao' && veiculo instanceof Caminhao) {
              const capacidadeInput = document.getElementById('capacidadeCarga');
              if (capacidadeInput && veiculo.capacidadeCarga) capacidadeInput.value = veiculo.capacidadeCarga;
         }
     }


    // --- Vehicle Creation/Update Methods ---
    _criarOuAtualizarVeiculo(nome, Classe, modelo, cor, extraArgs = []) {
        let isNew = false;
        const veiculoExistente = this.veiculos[nome];

        if (!veiculoExistente) {
            this.veiculos[nome] = new Classe(modelo, cor, ...extraArgs);
            this.veiculos[nome].nomeNaGaragem = nome; // Assign internal name
            console.log(`${Classe.name} criado!`);
            isNew = true;
        } else {
            veiculoExistente.modelo = modelo;
            veiculoExistente.cor = cor;
            // Handle specific updates (like capacity change for truck)
            if (Classe === Caminhao && extraArgs.length > 0) {
                 const novaCapacidade = extraArgs[0];
                 if (veiculoExistente.capacidadeCarga !== novaCapacidade) {
                     console.log("Capacidade do caminhão alterada. Zerando carga atual.");
                     veiculoExistente.capacidadeCarga = novaCapacidade > 0 ? novaCapacidade : 1000;
                     veiculoExistente.cargaAtual = 0;
                 }
            }
            console.log(`${Classe.name} atualizado!`);
        }

        const veiculo = this.veiculos[nome];
        // Update UI elements for this vehicle
        if (veiculo.atualizarDetalhes) veiculo.atualizarDetalhes();
        if (veiculo.atualizarStatus) veiculo.atualizarStatus();
        if (veiculo.atualizarVelocidadeDisplay) veiculo.atualizarVelocidadeDisplay();
        if (veiculo.atualizarPonteiroVelocidade) veiculo.atualizarPonteiroVelocidade();
        if (veiculo.atualizarInfoDisplay) veiculo.atualizarInfoDisplay();

        if (isNew) this.exibirInformacoes(nome);
        this.salvarGaragem(); // <-- SAVE changes
    }


    criarCarro() {
        const modelo = document.getElementById('modeloCarro').value.trim() || "Civic Padrão";
        const cor = document.getElementById('corCarro').value.trim() || "Branco";
        this._criarOuAtualizarVeiculo('meuCarro', Carro, modelo, cor);
    }

    criarCarroEsportivo() {
        const modelo = document.getElementById('modeloEsportivo').value.trim() || "Pagani Padrão";
        const cor = document.getElementById('corEsportivo').value.trim() || "Rosa";
        this._criarOuAtualizarVeiculo('carroEsportivo', CarroEsportivo, modelo, cor);
    }

    criarCaminhao() {
        const modelo = document.getElementById('modeloCaminhao').value.trim() || "Actros Padrão";
        const cor = document.getElementById('corCaminhao').value.trim() || "Cinza";
        const capacidade = parseInt(document.getElementById('capacidadeCarga').value, 10) || 5000;
        this._criarOuAtualizarVeiculo('caminhao', Caminhao, modelo, cor, [capacidade]);
    }

    criarMoto() {
        const modelo = document.getElementById('modeloMoto').value.trim() || "Ninja Padrão";
        const cor = document.getElementById('corMoto').value.trim() || "Preta/Rosa";
        this._criarOuAtualizarVeiculo('moto', Moto, modelo, cor);
    }

    // --- Interaction Methods ---
    interagirComVeiculo(nomeVeiculo, acao) {
        const veiculo = this.veiculos[nomeVeiculo];
        if (!veiculo) {
             let criarButtonSelector = '';
             if (nomeVeiculo === 'meuCarro') criarButtonSelector = 'button[onclick="garagem.criarCarro()"]';
             else if (nomeVeiculo === 'carroEsportivo') criarButtonSelector = 'button[onclick="garagem.criarCarroEsportivo()"]';
             else if (nomeVeiculo === 'caminhao') criarButtonSelector = 'button[onclick="garagem.criarCaminhao()"]';
             else if (nomeVeiculo === 'moto') criarButtonSelector = 'button[onclick="garagem.criarMoto()"]';
             alert(`Veículo "${nomeVeiculo}" não foi criado ainda. Use o botão 'Criar/Atualizar...' primeiro.`);
             if (criarButtonSelector) {
                 const criarBtn = document.querySelector(criarButtonSelector);
                 if (criarBtn) {
                     criarBtn.style.border = '2px solid red';
                     setTimeout(() => { criarBtn.style.border = ''; }, 2000);
                 }
             }
             return;
        }

        try {
            switch (acao) {
                case 'ligar': veiculo.ligar(); break;
                case 'desligar': veiculo.desligar(); break;
                case 'acelerar': veiculo.acelerar(); break;
                case 'frear': veiculo.frear(); break;
                case 'ativarTurbo':
                    if (veiculo instanceof CarroEsportivo) veiculo.ativarTurbo();
                    else alert(`Ação indisponível para ${nomeVeiculo}.`);
                    break;
                case 'desativarTurbo':
                    if (veiculo instanceof CarroEsportivo) veiculo.desativarTurbo();
                    else alert(`Ação indisponível para ${nomeVeiculo}.`);
                    break;
                case 'carregar':
                    const pesoCarregarInput = document.getElementById('pesoCarga');
                    if (veiculo instanceof Caminhao && pesoCarregarInput) {
                        veiculo.carregar(pesoCarregarInput.value);
                        pesoCarregarInput.value = '';
                    } else if (!(veiculo instanceof Caminhao)) alert(`Ação indisponível para ${nomeVeiculo}.`);
                    else console.error("Input 'pesoCarga' não encontrado.");
                    break;
                case 'descarregar':
                     const pesoDescargaInput = document.getElementById('pesoDescarga');
                    if (veiculo instanceof Caminhao && pesoDescargaInput) {
                        veiculo.descarregar(pesoDescargaInput.value);
                        pesoDescargaInput.value = '';
                    } else if (!(veiculo instanceof Caminhao)) alert(`Ação indisponível para ${nomeVeiculo}.`);
                     else console.error("Input 'pesoDescarga' não encontrado.");
                    break;
                default:
                    alert("Ação desconhecida.");
                    break;
            }
             // Update info display after interaction
             if(typeof veiculo.atualizarInfoDisplay === 'function') veiculo.atualizarInfoDisplay();
             const infoArea = document.getElementById('informacoesVeiculo');
              if (infoArea && infoArea.textContent.includes(`Modelo: ${veiculo.modelo}`)) {
                  this.exibirInformacoes(nomeVeiculo);
              }
              // Note: Saving is handled within individual action methods now
        } catch (error) {
            console.error(`Erro ao interagir com ${nomeVeiculo} (${acao}):`, error);
            alert(`Ocorreu um erro durante a ação "${acao}".`);
        }
    }

    pintarVeiculo(nomeVeiculo) {
        const veiculo = this.veiculos[nomeVeiculo];
        if (!veiculo) return alert(`Veículo "${nomeVeiculo}" não foi criado.`);

        let corPinturaInputId;
        if (nomeVeiculo === 'meuCarro') corPinturaInputId = 'corPintura';
        else if (nomeVeiculo === 'carroEsportivo') corPinturaInputId = 'corPinturaEsportivo';
        else if (nomeVeiculo === 'caminhao') corPinturaInputId = 'corPinturaCaminhao';
        else if (nomeVeiculo === 'moto') corPinturaInputId = 'corPinturaMoto';
        else return alert("Erro interno: Tipo de veículo desconhecido.");

        const corPinturaInput = document.getElementById(corPinturaInputId);
        if (corPinturaInput) {
            veiculo.pintar(corPinturaInput.value); // pintar calls salvarGaragem
             const infoArea = document.getElementById('informacoesVeiculo');
             if (infoArea && infoArea.textContent.includes(`Modelo: ${veiculo.modelo}`)) {
                 this.exibirInformacoes(nomeVeiculo);
             }
             corPinturaInput.value = '';
        } else {
             alert(`Erro interno: Campo de cor "${corPinturaInputId}" não encontrado.`);
        }
    }

    abastecerVeiculo(nomeVeiculo) {
        const veiculo = this.veiculos[nomeVeiculo];
        if (!veiculo) return alert(`Veículo "${nomeVeiculo}" não foi criado.`);

         let combustivelInputId;
         if (nomeVeiculo === 'meuCarro') combustivelInputId = 'combustivel';
         else if (nomeVeiculo === 'carroEsportivo') combustivelInputId = 'combustivelEsportivo';
         else if (nomeVeiculo === 'caminhao') combustivelInputId = 'combustivelCaminhao';
         else if (nomeVeiculo === 'moto') combustivelInputId = 'combustivelMoto';
         else return alert("Erro interno: Tipo de veículo desconhecido.");

        const combustivelInput = document.getElementById(combustivelInputId);

        if(combustivelInput) {
             const quantidade = parseInt(combustivelInput.value, 10);
             if (!isNaN(quantidade) && quantidade >= 0) {
                 const combustivelAntes = veiculo.combustivel;
                 veiculo.combustivel = Math.min(combustivelAntes + quantidade, 100);
                 const adicionado = veiculo.combustivel - combustivelAntes;
                 alert(`${nomeVeiculo} abastecido. Combustível: ${veiculo.combustivel}%`);
                 combustivelInput.value = '';

                 if(typeof veiculo.atualizarInfoDisplay === 'function') veiculo.atualizarInfoDisplay();
                 if(typeof veiculo.atualizarStatus === 'function') veiculo.atualizarStatus();

                 const infoArea = document.getElementById('informacoesVeiculo');
                 if (infoArea && infoArea.textContent.includes(`Modelo: ${veiculo.modelo}`)) {
                     this.exibirInformacoes(nomeVeiculo);
                 }
                 this.salvarGaragem(); // <-- SAVE fuel level
             } else {
                 alert("Insira uma quantidade de combustível válida (número >= 0).");
             }
        } else {
            alert(`Erro interno: Campo de combustível "${combustivelInputId}" não encontrado.`);
        }
    }

     registrarManutencao(nomeVeiculo) {
         const veiculo = this.veiculos[nomeVeiculo];
         if (!veiculo) return alert(`Veículo "${nomeVeiculo}" não criado.`);

         let prefixoId = '';
         if (nomeVeiculo === 'meuCarro') prefixoId = 'Carro';
         else if (nomeVeiculo === 'carroEsportivo') prefixoId = 'Esportivo';
         else if (nomeVeiculo === 'caminhao') prefixoId = 'Caminhao';
         else if (nomeVeiculo === 'moto') prefixoId = 'Moto';
         else return alert("Tipo de veículo desconhecido.");

         const dataInput = document.getElementById(`dataManutencao${prefixoId}`);
         const tipoInput = document.getElementById(`tipoManutencao${prefixoId}`);
         const custoInput = document.getElementById(`custoManutencao${prefixoId}`);
         const descInput = document.getElementById(`descManutencao${prefixoId}`);

         if (!dataInput || !tipoInput || !custoInput || !descInput) {
             return alert(`Erro interno: Campos de manutenção realizada para ${nomeVeiculo} não encontrados.`);
         }

         const novaManutencao = new Manutencao(
             dataInput.value,
             tipoInput.value.trim(),
             parseFloat(custoInput.value),
             descInput.value.trim(),
             null, // hora is null for completed form
             'concluida' // status is completed
         );

         // adicionarManutencao handles validation, adding, alerting, saving, UI update
         const success = veiculo.adicionarManutencao(novaManutencao);
         if (success) {
              dataInput.value = ''; tipoInput.value = ''; custoInput.value = ''; descInput.value = '';
         }
     }

     agendarManutencao(nomeVeiculo) {
         const veiculo = this.veiculos[nomeVeiculo];
         if (!veiculo) return alert(`Veículo "${nomeVeiculo}" não criado.`);

         let prefixoId = '';
         if (nomeVeiculo === 'meuCarro') prefixoId = 'Carro';
         else if (nomeVeiculo === 'carroEsportivo') prefixoId = 'Esportivo';
         else if (nomeVeiculo === 'caminhao') prefixoId = 'Caminhao';
         else if (nomeVeiculo === 'moto') prefixoId = 'Moto';
         else return alert("Tipo de veículo desconhecido.");

         const dataInput = document.getElementById(`dataAgendamento${prefixoId}`);
         const horaInput = document.getElementById(`horaAgendamento${prefixoId}`);
         const tipoInput = document.getElementById(`tipoAgendamento${prefixoId}`);
         const obsInput = document.getElementById(`obsAgendamento${prefixoId}`);

          if (!dataInput || !horaInput || !tipoInput || !obsInput) {
             return alert(`Erro interno: Campos de agendamento para ${nomeVeiculo} não encontrados.`);
         }

         const novoAgendamento = new Manutencao(
             dataInput.value,
             tipoInput.value.trim(),
             null, // cost is null for scheduled
             obsInput.value.trim(),
             horaInput.value || null, // hora
             'agendada' // status is scheduled
         );

         // Basic future date validation
         const dataAgendada = novoAgendamento.getDateTime();
         const agora = new Date();
         agora.setSeconds(0, 0);
         if (!dataAgendada) return alert("Erro: Data ou hora inválida para agendamento.");
         if (dataAgendada < agora) return alert("Erro: Data/hora do agendamento deve ser no futuro.");

         // adicionarManutencao handles full validation, adding, alerting, saving, UI update
         const success = veiculo.adicionarManutencao(novoAgendamento);
         if (success) {
              dataInput.value = ''; horaInput.value = ''; tipoInput.value = ''; obsInput.value = '';
         }
     }

     atualizarListaAgendamentos() {
         const listaElement = document.getElementById('listaAgendamentos');
         if (!listaElement) return console.error("Elemento 'listaAgendamentos' não encontrado.");

         listaElement.innerHTML = ''; // Clear list
         const agora = new Date();
         let todosAgendamentos = [];

         for (const nomeVeiculo in this.veiculos) {
             if (this.veiculos.hasOwnProperty(nomeVeiculo)) {
                 const veiculo = this.veiculos[nomeVeiculo];
                 if(Array.isArray(veiculo.historicoManutencao)) {
                     veiculo.historicoManutencao.forEach(m => {
                         const manutencao = (m instanceof Manutencao) ? m : new Manutencao(m.data, m.tipo, m.custo, m.descricao, m.hora, m.status);
                         const dataManutencao = manutencao.getDateTime();
                         if (manutencao.status === 'agendada' && dataManutencao && dataManutencao >= agora && manutencao.isValid()) {
                             todosAgendamentos.push({
                                 veiculoNome: nomeVeiculo,
                                 veiculoModelo: veiculo.modelo,
                                 manutencao: manutencao,
                                 dataObj: dataManutencao
                             });
                         }
                     });
                 }
             }
         }

         todosAgendamentos.sort((a, b) => a.dataObj - b.dataObj); // Sort earliest first

         if (todosAgendamentos.length === 0) {
             const li = document.createElement('li');
             li.textContent = 'Nenhum agendamento futuro encontrado.';
             li.className = 'nenhum';
             listaElement.appendChild(li);
         } else {
             todosAgendamentos.forEach(item => {
                 const li = document.createElement('li');
                 li.textContent = `[${item.veiculoModelo}] ${item.manutencao.formatar()}`;
                 listaElement.appendChild(li);
             });
         }
     }

    // --- Display Methods ---
    exibirInformacoes(nomeVeiculo) {
        const veiculo = this.veiculos[nomeVeiculo];
        const infoArea = document.getElementById('informacoesVeiculo');
        if (!infoArea) return console.error("Elemento 'informacoesVeiculo' não encontrado.");

        if (veiculo) {
            try {
                infoArea.textContent = veiculo.exibirInformacoes();
             } catch (error) {
                 console.error(`Erro ao exibir informações para ${nomeVeiculo}:`, error);
                 infoArea.textContent = `Erro ao obter informações para ${veiculo.modelo || nomeVeiculo}.`;
            }
        } else {
            infoArea.textContent = `Veículo "${nomeVeiculo}" não existe. Crie-o usando o botão correspondente.`;
        }
    }
}

// --- Initialization ---
const garagem = new Garagem(); // Constructor calls carregarGaragem

window.onload = () => {
    // Garagem constructor already tried loading.
    // Check if defaults are needed.
    if (Object.keys(garagem.veiculos).length === 0) {
        console.log("Nenhum veículo carregado, criando padrões.");
        // Create methods now handle saving internally and updating UI partially.
        garagem.criarCarro();
        garagem.criarMoto();
        garagem.criarCarroEsportivo();
        garagem.criarCaminhao();
         // Full UI update is needed after defaults are created
         garagem.atualizarUICompleta();
    } else {
        console.log("Veículos carregados. Atualizando UI.");
        // Ensure the entire UI reflects the loaded state.
        garagem.atualizarUICompleta();
    }
     // Initial population of the scheduled list (might be empty if no data)
     // Note: atualizarUICompleta now includes this call
     // garagem.atualizarListaAgendamentos();
};
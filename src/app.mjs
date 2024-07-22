const App = {
    web3: null,
    account: null,
    contracts: {},
    loading: false,

    // Function to load Web3
    loadWeb3: async () => {
        if (typeof window.ethereum !== 'undefined' || typeof window.web3 !== 'undefined') {
            const provider = window['ethereum'] || window.web3.currentProvider;
            App.web3 = new Web3(provider);
            console.log('Web3 instance loaded');
        } else {
            console.error('MetaMask is not installed!');
        }
    },

    loadAccount: async () => {
        if (App.web3) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                App.account = accounts[0];

                console.log('Connected to account:', App.account);
            } catch (error) {
                console.error('User rejected the request:', error);
            }
        } else {
            console.error('Web3 is not initialized!');
        }
    },

    loadContracts: async () => {
        if (App.web3 && App.account) {
            const todoList = await $.getJSON('TodoList.json');
            try {
                App.contracts.TodoList = TruffleContract(todoList);
                App.contracts.TodoList.setProvider(App.web3.currentProvider);

                App.todoList = await App.contracts.TodoList.deployed();
                console.log('Contract instance loaded:', App.todoList);
            } catch (error) {
                console.error('Error loading contract or interacting with it:', error);
            }

        } else {
            console.error('Web3 or accounts are not available!');
        }
    },

    render: async () => {
        // Prevent double render
        if (App.loading) {
            return
        }

        // Update app loading state
        App.setLoading(true);

        // Render Account
        $('#account').html(App.account);

        // Render Tasks
        await App.renderTasks();

        // Update loading state
        App.setLoading(false);

    },

    renderTasks: async () => {
        // Load the total task count from the blockchain
        const taskCount = await App.todoList.taskCount();
        const $taskTemplate = $('.taskTemplate');

        // Render out each task with a new task template
        for (var i = 1; i <= taskCount; i++) {
            // Fetch the task data from the blockchain
            const task = await App.todoList.tasks(i);
            const taskId = task[0].toNumber();
            const taskContent = task[1];
            const taskCompleted = task[2];

            // Create the html for the task
            const $newTaskTemplate = $taskTemplate.clone();
            $newTaskTemplate.find('.content').html(taskContent);
            $newTaskTemplate.find('input')
                            .prop('name', taskId)
                            .prop('checked', taskCompleted)
                            .on('click', App.toggleCompleted);

            // Put the task in the correct list
            if (taskCompleted) {
                $('#completedTaskList').append($newTaskTemplate);
            } else {
                $('#taskList').append($newTaskTemplate);
            }

            // Show the task
            $newTaskTemplate.show();
        }
    },

    createTask: async (e) => {
        e.preventDefault();

        App.setLoading(true)
        const content = $('#newTask').val()
    
        await App.todoList.createTask(content, { from: App.account });

        window.location.reload()
    },

    toggleCompleted: async (e) => {
        App.setLoading(true);
        const taskId = e.target.name;
        await App.todoList.toggleCompleted(taskId, { from: App.account });
        window.location.reload();
    },

    setLoading: (boolean) => {
        App.loading = boolean
        const loader = $('#loader')
        const content = $('#content')
        if (boolean) {
          loader.show()
          content.hide()
        } else {
          loader.hide()
          content.show()
        }
    },

    load: async () => { 
        await App.loadWeb3();
        await App.loadAccount();
        await App.loadContracts();
        await App.render();
    },
}

// Call load function on window load
window.addEventListener('load', () => {
    App.load();

    const form = document.getElementById('newTaskForm');
    form.addEventListener('submit', App.createTask);
});
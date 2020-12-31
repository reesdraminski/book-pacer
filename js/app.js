const SAVE_LOCATION = "books";

const hasLocalStorage = checkForLocalStorage();

const addBookButton = document.getElementById("addBook");
const booksSection = document.getElementById("books");
const bookEntryModal = document.getElementById("bookEntryModal");
const modalCloseButton = document.getElementById("close");
const addBookForm = document.getElementById("addBookForm");

const bookTitleInput = document.getElementById("bookTitle");
const bookAuthorInput = document.getElementById("bookAuthor");
const numPagesInput = document.getElementById("numPages");
const pagesReadInput = document.getElementById("pagesRead");
const goalDaysInput = document.getElementById("goalDays");
const goalStartInput = document.getElementById("goalStart");
const numSessionsInput = document.getElementById("numSessions");

const books = [];

let currentlyEditing;

/**
 * Retrieve data from storage and initialize UI components.
 */
(function initUI() {
    // if the user's browser supports localStorage
    if (hasLocalStorage)
    {
        // get the books data from localStorage
        const data = JSON.parse(localStorage.getItem(SAVE_LOCATION));

        // check if there was actually data stored
        if (data)
        {
            books.push(...data);
        }
    }

    // bind button click and keydown listeners
    bindListeners();

    // set the default reading start date to today
    document.getElementById("goalStart").value = new Date().toLocaleDateString("en-CA");

    // render the book items
    render();
})();

/**
 * Bind button click and keydown listeners.
 */
function bindListeners() {
    addBookButton.onclick = () => {
        bookEntryModal.style.display = "block";
        addBookButton.blur();
    }

    modalCloseButton.onclick = closeModal;

    document.onkeydown = e => {
        if (e.key == "Escape")
        {
            closeModal();
        }
    }
}

/**
 * Intercept the book entry form from being submitted.
 * This handles both adding new books and editing existing books.
 * @param {Event} e 
 */
addBookForm.onsubmit = e => {
    // prevent the form from actually submitting
    e.preventDefault();

    // extract data from the form
    const title = bookTitleInput.value;
    const author = bookAuthorInput.value;
    const numPages = numPagesInput.value;
    const pagesRead = pagesReadInput.value;
    const goalDays = goalDaysInput.value;
    const numSessions = numSessionsInput.value;

    // get goal start date and transform to ensure accurate date parsing
    const goalStart = goalStartInput.value;
    const [year, month, day] = goalStart.split("-");
    const rearrangedDate = `${month}/${day}/${year}`;
    const goalStartTime = new Date(rearrangedDate).getTime();

    // edit the new book
    if (currentlyEditing)
    {
        // set the attributes of the existing book object
        currentlyEditing.title = title;
        currentlyEditing.author = author;
        currentlyEditing.pagesRead = pagesRead;
        currentlyEditing.numPages = numPages;
        currentlyEditing.goalStart = goalStartTime;
        currentlyEditing.goalDays = goalDays;
        currentlyEditing.numSessions = numSessions;

        // reset to not editing anything
        currentlyEditing = null;
    }
    // add the new book
    else 
    {
        books.push({
            title: title,
            author: author,
            pagesRead: pagesRead,
            numPages: numPages,
            goalStart: goalStartTime,
            goalDays: goalDays,
            numSessions: numSessions
        });
    }

    // save the changes to the book
    saveData();

    // close the modal
    closeModal();

    // reset the form
    addBookForm.reset();

    // re-render the books display
    render();
}


/**
 * Show the user's book pacings.
 */
function render() {
    // clear out whatever was previously in the books section
    booksSection.innerHTML = "";

    // if the user has no books to show
    if (books.length === 0)
    {
        // show a message to the user that they haven't added any books yet
        createElement(booksSection, "div", { 
            class: "box",
            innerHTML: "<p style='margin-bottom: 0; margin-top: 0;'>You have not added any books yet!</p>"
        });
        
        return;
    }

    // render all the books
    books.forEach((book, index) => {
        // create a div for all the book information to be displayed
        const bookDiv = createElement(booksSection, "div", { class: "box" });

        // add header with book title and author
        createElement(bookDiv, "h3", { 
            innerHTML: `${book.title} <small>by ${book.author}</small>`,
            style: "margin-top: 0"
        });

        // create a header for duration goal progress bar
        createElement(bookDiv, "p", { 
            textContent: "Progress of Reading Duration Goal:",
            style: "font-weight: bold; margin-bottom: 5px"
        });

        // calculate how much time has passed since reading start
        const delta = new Date().getTime() - book.goalStart;
        const days = delta / (24 * 60 * 60 * 1000);

        // only show if the goal has started
        if (delta > 0)
        {
            // add reading duration goal progress bar
            createElement(bookDiv, "progress", {
                value: days,
                max: book.goalDays
            });

            // add days readout to provide context for progress bar
            createElement(bookDiv, "span", { 
                textContent: `You are on day ${Math.floor(days)} of ${book.goalDays} of your goal.`
            });
        }

        // create a header for reading progress bar
        createElement(bookDiv, "p", { 
            textContent: "Your Reading Progress:",
            style: "font-weight: bold; margin-bottom: 5px"
        });

        // add reading progress bar
        createElement(bookDiv, "progress", {
            value: book.pagesRead,
            max: book.numPages
        });

        // add pages readout to provide context for progress bar
        createElement(bookDiv, "span", { 
            textContent: `${book.pagesRead} out of ${book.numPages} pages read (${(book.pagesRead / book.numPages * 100).toFixed(2)}%)`
        });

        // create a header for reading sessions list
        createElement(bookDiv, "p", { 
            textContent: "Today's Reading Sessions:",
            style: "font-weight: bold; margin-bottom: 0"
        });

        // create a sessions summary list
        const sessionsList = createElement(bookDiv, "ol", { style: "margin-top: .5em;" });

        // calculate how many pages the user needs to read per session
        const pagesPerSession = Math.ceil(book.numPages / (book.goalDays * book.numSessions));

        // save the pages read count at the start of the day
        if (!book.hasOwnProperty("dailyStartPages"))
        {
            book.dayRead = new Date().getTime();
            book.dailyStartPages = book.pagesRead;
        }
        // if there is a reading date associated
        else
        {
            // if reading sessions were on a different day
            if (!datesAreOnSameDay(new Date(book.dayRead), new Date()))
            {
                book.dayRead = new Date().getTime();
                book.dailyStartPages = book.pagesRead;
            }
        }

        // add session summaries to tell the user how much they need to read per session
        let prevPageNum = parseInt(book.dailyStartPages, 10);
        for (let i = 0; i < book.numSessions; i++) 
        {
            const nextPageNum = prevPageNum + pagesPerSession;

            // create a session box item to show what the user needs to read for that session
            createElement(sessionsList, "li", {
                textContent: `Read from page ${prevPageNum} to ${nextPageNum}.`,
                class: nextPageNum < book.pagesRead ? "strikethrough" : ""
            });

            prevPageNum = nextPageNum;
        }

        // add a paragraph to hold the book update buttons
        const buttonContainer = createElement(bookDiv, "p", { style: "margin-bottom: 0" });

        // add an update reading progress button
        createElement(buttonContainer, "button", {
            textContent: "Update Reading Progress",
            style: "margin-right: 5px",
            onclick: () => {
                // get the newest page number
                const newPages = prompt("What page number did you read to?");

                // if the user puts nothing in the prompt
                if (!newPages) return;

                // if the user enters a string or something that is otherwise not a number
                if (isNaN(newPages))
                {
                    alert("That is not a valid page number.");
                }
                // if the user enters a page number that is prior to the current page number
                else if (newPages < book.pagesRead) 
                {
                    if (!confirm("Are you sure you want to put a lower page number?"))
                    {
                        return;
                    }
                }

                // update number of pages read
                book.pagesRead = newPages;

                // save the changes
                saveData();

                // re-render the books
                render();
            }
        });

        // add a edit book information button
        createElement(buttonContainer, "button", {
            textContent: "Edit Book Information",
            style: "margin-right: 5px",
            onclick: () => {
                // open modal
                bookEntryModal.style.display = "block";

                // pre-populate the form inputs
                bookTitleInput.value = book.title;
                bookAuthorInput.value = book.author;
                numPagesInput.value = book.numPages;
                pagesReadInput.value = book.pagesRead;
                goalDaysInput.value = book.goalDays;
                goalStartInput.value = new Date(book.goalStart).toLocaleDateString("en-CA");
                numSessionsInput.value = book.numSessions;

                // set the currently editing book
                currentlyEditing = book;
            }
        });

        // add a delete book button
        createElement(buttonContainer, "button", { 
            textContent: "Delete Book",
            onclick: () => {
                // make sure the user actually wants to delete the book
                if (confirm("Are you sure you want to delete this book?")) 
                {
                    // delete the book from the books array
                    books.splice(index, 1);

                    // save changes
                    saveData();

                    // re-render books display
                    render();
                }
            }
        });
    });
}

/**
 * Close the book entry modal by hiding it.
 */
function closeModal() {
    bookEntryModal.style.display = "";
}

/**
 * Save the book data to localStorage.
 */
function saveData() {
    if (hasLocalStorage)
    {
        localStorage.setItem(SAVE_LOCATION, JSON.stringify(books));
    }
}

/**
 * Check to see if two dates are the same day.
 * @param {Date} first 
 * @param {Date} second 
 * @return {Boolean} areOnSameDay
 */
function datesAreOnSameDay(first, second) {
    return first.getFullYear() === second.getFullYear() 
        && first.getMonth() === second.getMonth() 
        && first.getDate() === second.getDate()
}

/**
 * Create an HTML element and add it to the DOM tree.
 * @param {HTMLElement} parent 
 * @param {String} tag 
 * @param {Object} attributes 
 */
function createElement(parent, tag, attributes={}) {
    // create the element to whatever tag was given
    const el = document.createElement(tag);
    
    // go through all the attributes in the object that was given
    Object.entries(attributes)
        .forEach(([attr, value]) => {
            // handle the various special cases that will cause the Element to be malformed
            if (attr == "innerText") 
            {
                el.innerText = value;
            }
            else if (attr == "innerHTML") 
            {
                el.innerHTML = value;
            }
            else if (attr == "textContent") 
            {
                el.textContent = value;
            }
            else if (attr == "onclick")
            {
                el.onclick = value;
            }
            else if (attr == "onkeydown")
            {
                el.onkeydown = value;
            }
            else
            {
                el.setAttribute(attr, value);
            }
        });
    
    // add the newly created element to its parent
    parent.appendChild(el);

    // return the element in case this element is a parent for later element creation
    return el;
}

/**
 * Check if localStorage exist and is available.
 * https://stackoverflow.com/questions/16427636/check-if-localstorage-is-available/16427747
 * @return {Boolean} localStorageExists
 */
function checkForLocalStorage(){
    const test = "test";

    try {
        localStorage.setItem(test, test);
        localStorage.removeItem(test);

        return true;
    } catch(e) {
        return false;
    }
}
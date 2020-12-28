const SAVE_LOCATION = "books";

const hasLocalStorage = checkForLocalStorage();

const addBookButton = document.getElementById("addBook");
const booksSection = document.getElementById("books");
const bookEntryModal = document.getElementById("bookEntryModal");
const modalCloseButton = document.getElementById("close");
const addBookForm = document.getElementById("addBookForm");

const books = [];

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
 * Intercept the Add Book form from being submitted.
 * @param {Event} e 
 */
addBookForm.onsubmit = e => {
    // prevent the form from actually submitting
    e.preventDefault();

    // create a FormData object to easily query form data
    const formData = new FormData(addBookForm);

    // extract data from the form
    const title = formData.get("bookTitle");
    const author = formData.get("bookAuthor");
    const numPages = formData.get("numPages");
    const pagesRead = formData.get("pagesRead");
    const numDays = formData.get("numDays");
    const numSessions = formData.get("numSessions");

    // add the new book
    books.push({
        title: title,
        author: author,
        pagesRead: pagesRead,
        numPages: numPages,
        numDays: numDays,
        numSessions: numSessions
    });

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
            innerHTML: "<p style='margin-bottom: 0'>You have not added any books yet!</p>"
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

        // create a header for reading sessions list
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
        const pagesPerSession = Math.ceil(book.numPages / (book.numDays * book.numSessions));

        // add session summaries to tell the user how much they need to read per session
        let prevPageNum = parseInt(book.pagesRead, 10);
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
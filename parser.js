const sizes = /1\/2" Leash|XS|(s|S)(mall|m|M)|(m|M)(edium|ed|D|d)|(l|L)(arge|g|G)|X+L|(4|5|6)X|(6|8|10) inch|(^| )\d+( |$|')| S$| M$| L$/;
var productGroups = [];
var processStatus = document.getElementById("processStatus");

// sets up submit button to load file if it is selected
window.onload = function() {
    document.getElementById("processStatus").innerHTML = "";

    var inputFile = document.getElementById("inputFile");

    inputFile.onchange = function() {
        if (inputFile)
        {
            var reader = new FileReader();
            reader.onload = function(evt) {
                ParseOptions(evt.target.result);
            }
            reader.readAsText(inputFile.files[0]);
        }
        else
        {
            document.getElementById("processStatus").innerHTML = "No File Selected";
        }
    }    
}

// adds header options and passes info on to parsefile when hitting select
function ParseOptions(file)
{
    splitData = file.split('\n');
    
    var headers = splitData[0].split(',');

    var skuSelect = document.getElementById("skuSelect");
    var nameSelect = document.getElementById("nameSelect");

    headers.forEach(h => {
        var opt1 = document.createElement("option");
        opt1.value = h;
        opt1.text = h;

        var opt2 = document.createElement("option");
        opt2.value = h;
        opt2.text = h;

        skuSelect.add(opt1);
        nameSelect.add(opt2);
    });

    var submitButton = document.getElementById("submitButton");

    submitButton.onclick = function() {
        document.getElementById("processStatus").innerHTML = "Processing..";
        ParseFile(splitData, skuSelect.selectedIndex, nameSelect.selectedIndex);
    }
}

function ParseFile(splitData, skuIndex, nameIndex)
{
    
    // add products to groups
    for (var i = 1; i < splitData.length - 1; i++)
    {
        ParseProduct(splitData[i], i, skuIndex, nameIndex);
    }

    // get the common names for all the groups and add the values to those products
    productGroups.forEach(group => {
        group.findName();

        group.products.forEach(product => {
            product.SeparateName(group.wordList);
            product.FindValue();
        });
    });

    //export data
    let prefix = "data:text/csv;charset=utf-8,";

    let csvContent = "";

    // add value and column headers to first row
    csvContent += splitData[0].substring(0, splitData[0].length - 1) + ",name,value\n";

    // add in value and name columns for each product
    productGroups.forEach(group => {
        group.products.forEach(product => {
            if (group.name.includes(","))
            {
                csvContent += splitData[product.index].substring(0, splitData[product.index].length - 1) + ',"' + group.name + '",' + product.valueText + "\n";
            }
            else
            {
                csvContent += splitData[product.index].substring(0, splitData[product.index].length - 1) + ',' + group.name + ',' + product.valueText + "\n";
            } 
        });
    });

    // create and initiate the download, have to do prefix becuase of #s in names
    var encodedUri = prefix + encodeURIComponent(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "output.csv");
    document.body.appendChild(link);

    link.onclick = function() {
        document.getElementById("processStatus").innerHTML = "";
    }
    link.click();
    
}

// either adds a product to a matching group, or creates new group with product sku
function ParseProduct(productStr, currentIndex, skuIndex, nameIndex)
{
    if (productStr.match(/\w/))
    {
        // create product, switch out commas in names to avoid splitting them
        var prodWithoutCommas = productStr.replace(/(?<=,".+),(?=.+",)/g, "^");
        prodWithoutCommas = prodWithoutCommas.replace(/"\^"/g, '","');

        var prodSplit = prodWithoutCommas.split(',');

        // put commas back in, and remove necessary quotes
        var productName = prodSplit[nameIndex].replace(/^"|"$/g, "").replace(/""/g, '"').replace(/\^/g, ",").trim();

        // remove dashes from end of names
        productName = productName.replace(/ -/, "");

        var tempProduct = new Product(productName, prodSplit[skuIndex], currentIndex);
        
        var skuHead = tempProduct.sku.split(' ')[0];

        if (tempProduct.sku.match(/-/g).length > 1 && !tempProduct.sku.match(/ /g))
        {
            var skuHead = tempProduct.sku.split('-')[0];
        }
        
        // go through each group, if sku matches, add product to group
        var inGroup = false;

        productGroups.forEach(group => {
            if (skuHead == group.skuHead)
            {
                group.products.push(tempProduct);
                inGroup = true;
            }
        });

        // if no matches, create new group with sku
        if (inGroup == false)
        {
            var group = new ProductGroup(skuHead);
            group.products.push(tempProduct);
            productGroups.push(group);
        }
    }
}

// groups items by the beginning of the sku
class ProductGroup
{
    constructor(skuHead) {
        this.skuHead = skuHead;
        this.products = [];
        this.name = "";
        this.wordList = [];
    }

    

    // matches words from the names in the group, to find the common name
    findName() {
        if (this.products.length > 1)
        {
            var nameOneSplit = this.products[0].name.split(" ");
            var finalName = "";

            for(var i = 0; i < nameOneSplit.length; i++)
            {
                var wordMatch = true;

                this.products.forEach(product => {

                    var tempName = product.name.toLowerCase().split(" ");
                    
                    if (!tempName.includes(nameOneSplit[i].toLowerCase()))
                    {
                        wordMatch = false;
                    }
                    
                });

                if (wordMatch)
                {
                    finalName += nameOneSplit[i] + " ";
                    this.wordList.push(nameOneSplit[i]);
                }
            }

            this.name = finalName;
        }
        else
        {
            this.name = this.products[0].name;
        }

        // remove size from name
        this.name = this.name.replace(/Size /, "");
    }
}

class Product {
    constructor(name, sku, index) {
        this.name = name;
        this.sku = sku;
        this.index = index;
    }

    // separate values from names
    SeparateName(wordList)
    {
        var valueSplit = this.name.split(" ");

        var wordRemoved = false;

        // takes into account word as given, upper case, lower case, and first letter capitalized
        wordList.forEach((word) => {

            wordRemoved = false;

            if (!wordRemoved && valueSplit.indexOf(word) != -1) 
            {
                valueSplit.splice(valueSplit.indexOf(word), 1);
                wordRemoved = true;
            }
            if (!wordRemoved && valueSplit.indexOf(word.toUpperCase()) != -1) 
            {
                valueSplit.splice(valueSplit.indexOf(word.toUpperCase()), 1);
                wordRemoved = true;
            }
            if (!wordRemoved && valueSplit.indexOf(word.toLowerCase()) != -1) 
            {
                valueSplit.splice(valueSplit.indexOf(word.toLowerCase()), 1);
                wordRemoved = true;
            }
            if (!wordRemoved && valueSplit.indexOf(word.slice(0, 1).toUpperCase() + word.substring(1).toLowerCase()) != -1) 
            {
                valueSplit.splice(valueSplit.indexOf(word.slice(0, 1).toUpperCase() + word.substring(1).toLowerCase()), 1);
                wordRemoved = true;
                
            }
            
        });

        this.value = valueSplit.join(" ");

        if (this.value == this.name) 
        {
            this.value = "";
        }
    }

    // separates the size and other variants and sets the value for this product
    FindValue()
    {
        this.valueText = "";

        if (this.value != "")
        {
            //removes exceptions *the word size, anything in parentheses, word pet)
            this.value = this.value.replace(/Size: |Size |\(.+\)|Pet /g, "");

            // Finds the size if there is one that matches
            var size = this.value.match(sizes);

            // Removes the size from the rest of the value
            var option = this.value.replace(sizes, "").trim();

            // Assembles the value text, depending on if there is a size or option or both
            if (option)
            {
                this.valueText += "Option: " + option;
            }
            if (size)
            {
                if (this.valueText != "")
                {
                    this.valueText += ";";
                }
                this.valueText += "Size: " + size[0].trim();
            } 
        }  
        else 
        {
           this.valueText == ""; 
        }
    }
}
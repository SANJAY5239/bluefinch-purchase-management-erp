BLUEFINCH DASHBOARD
===================

Purchase Management Dashboard

Project Name:
Bluefinch Dashboard

Technology:
HTML
CSS
JavaScript
PHP
JSON

Database:
No database required.

FEATURES
--------

1. Login
2. Dashboard
3. Purchase Orders
4. Create Purchase Order
5. Edit Purchase Order
6. Delete Purchase Order
7. Save Purchase Order as Draft
8. Submit Purchase Order
9. Dynamic Multiple Item Rows
10. Automatic Item Code
11. Automatic Description
12. Automatic Unit
13. Automatic Purchase Price
14. Automatic Tax
15. Real-time Calculation
16. Supplier Master
17. Supplier CRUD
18. Item Master
19. Item CRUD
20. Search
21. PHP API
22. JSON Data Storage
23. Backend Validation


DEMO LOGIN
----------

Email:
admin@example.com

Password:
admin123


HOW TO RUN
----------

1. Install XAMPP.

2. Start Apache.

3. Copy the project folder into:

C:\xampp\htdocs\

The folder should be:

C:\xampp\htdocs\bluefinch_dashboard\


4. Open browser:

http://localhost/bluefinch_dashboard/


5. Login using:

admin@example.com
admin123


IMPORTANT
---------

Do NOT open HTML files by double-clicking.

Do NOT use:

file:///C:/xampp/htdocs/bluefinch_dashboard/login.html

Use Apache URL:

http://localhost/bluefinch_dashboard/


API FLOW
--------

Frontend
   |
   | JavaScript Fetch
   v
PHP API
   |
   | Validation / CRUD
   v
JSON files
   |
   v
PHP JSON Response
   |
   v
Frontend


DATA FILES
----------

data/suppliers.json

data/items.json

data/purchase_orders.json


API FILES
---------

api/dashboard.php

api/suppliers.php

api/items.php

api/purchase_orders.php


INTERVIEW EXPLANATION
---------------------

"I developed the Purchase Management Dashboard using HTML, CSS and
JavaScript for the frontend and PHP APIs for the backend.

The assignment specifically required the application to work without a
database, so I used JSON files for persistent storage.

The frontend communicates with PHP using JavaScript Fetch API. The PHP
backend receives the request, validates the data, performs CRUD operations
and returns JSON responses.

Purchase orders support dynamic multiple item rows and JavaScript calculates
subtotal, discount, tax, additional charges and grand total in real time."


PROJECT STRUCTURE
-----------------

bluefinch_dashboard/

    index.html
    login.html

    pages/
        dashboard.html
        purchase-orders.html
        create-purchase-order.html
        suppliers.html
        items.html

    assets/
        css/
            style.css

        js/
            api.js
            app.js

    api/
        dashboard.php
        suppliers.php
        items.php
        purchase_orders.php

    config/
        config.php

    data/
        suppliers.json
        items.json
        purchase_orders.json

    .htaccess
    README.txt
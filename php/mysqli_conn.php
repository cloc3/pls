<?php
include $_SERVER['DOCUMENT_ROOT'].'/var/lib/dbConnect2.php';
$conn = new dbConnect('pls_marinelli_2026');
if ($conn->connect_error) {
    die("Connessione fallita: " . $conn->connect_error);
}
$link=$conn->link;


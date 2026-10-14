<?php
// Recebe o formulário do site e envia por e-mail para contato@adrisert.com.br.
// O lead é sempre gravado em leads.log (bloqueado ao público pelo .htaccess).
header('Content-Type: application/json; charset=utf-8');

const DESTINO = 'contato@adrisert.com.br';

function responder($ok, $erro = '') {
    echo json_encode(['ok' => $ok, 'erro' => $erro]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); responder(false, 'metodo'); }
if (!empty($_POST['site'])) { responder(true); } // honeypot: robô

function limpa($v, $max = 1000) {
    $v = trim((string)$v);
    $v = str_replace(["\r", "\n"], ' ', $v);
    return mb_substr(strip_tags($v), 0, $max);
}

$nome     = limpa($_POST['nome'] ?? '', 120);
$telefone = limpa($_POST['telefone'] ?? '', 30);
$email    = limpa($_POST['email'] ?? '', 150);
$servico  = limpa($_POST['servico'] ?? '', 80);
$mensagem = mb_substr(trim(strip_tags((string)($_POST['mensagem'] ?? ''))), 0, 3000);
$origem   = limpa($_POST['utm'] ?? '', 500);

if ($nome === '' || strlen(preg_replace('/\D/', '', $telefone)) < 10) { http_response_code(422); responder(false, 'dados'); }
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) { $email = ''; }

session_start();
if (isset($_SESSION['ultimo']) && time() - $_SESSION['ultimo'] < 30) { http_response_code(429); responder(false, 'espere'); }
$_SESSION['ultimo'] = time();

$corpo = "Novo contato pelo site\n\n"
       . "Nome: $nome\nTelefone: $telefone\nE-mail: " . ($email ?: '-') . "\n"
       . "Serviço: " . ($servico ?: '-') . "\n\nMensagem:\n$mensagem\n\n"
       . "Origem (anúncio): $origem\n"
       . "IP: " . ($_SERVER['REMOTE_ADDR'] ?? '') . "\n";

@file_put_contents(__DIR__ . '/leads.log', '[' . date('Y-m-d H:i:s') . "]\n$corpo\n----\n", FILE_APPEND | LOCK_EX);

$headers = "From: Site Adrisert <no-reply@adrisert.com.br>\r\n"
         . ($email ? "Reply-To: $email\r\n" : '')
         . "Content-Type: text/plain; charset=UTF-8\r\n";
$assunto = '=?UTF-8?B?' . base64_encode("Novo contato do site: $nome") . '?=';

$enviado = @mail(DESTINO, $assunto, $corpo, $headers);
responder($enviado, $enviado ? '' : 'envio');

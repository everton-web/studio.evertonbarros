<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get form data
$name     = htmlspecialchars(trim($_POST['name'] ?? ''));
$email    = htmlspecialchars(trim($_POST['email'] ?? ''));
$whatsapp = htmlspecialchars(trim($_POST['whatsapp'] ?? ''));
$project  = htmlspecialchars(trim($_POST['project'] ?? ''));
$message  = htmlspecialchars(trim($_POST['message'] ?? ''));

// Validate required fields
if (empty($name) || empty($email) || empty($whatsapp)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Campos obrigatórios não preenchidos.']);
    exit;
}

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email inválido.']);
    exit;
}

// Email settings
$to = 'contato@evertonbrito.com';
$subject = "🔥 Novo Lead — $name";

// Build HTML email
$htmlBody = "
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
    .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 520px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .value { font-size: 16px; color: #222; margin-bottom: 20px; }
    .header { font-size: 22px; font-weight: bold; color: #111; margin-bottom: 24px; border-bottom: 2px solid #ff4000; padding-bottom: 12px; }
    .footer { font-size: 12px; color: #aaa; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class='card'>
    <div class='header'>🟠 Novo Lead</div>
    <div class='label'>Nome</div>
    <div class='value'>$name</div>
    <div class='label'>Email</div>
    <div class='value'>$email</div>
    <div class='label'>WhatsApp</div>
    <div class='value'>$whatsapp</div>
    <div class='label'>Tipo de Projeto</div>
    <div class='value'>" . ($project ?: '—') . "</div>
    <div class='label'>Mensagem</div>
    <div class='value'>" . ($message ? nl2br($message) : '—') . "</div>
    <div class='footer'>Enviado via evertonbrito.com</div>
  </div>
</body>
</html>";

// Email headers
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-type: text/html; charset=UTF-8\r\n";
$headers .= "From: Site evertonbrito.com <noreply@evertonbrito.com>\r\n";
$headers .= "Reply-To: $name <$email>\r\n";

// Send email
$sent = mail($to, $subject, $htmlBody, $headers);

// +++ lead no SaaS (agência) — não bloqueia o envio do e-mail +++
$agenciaToken = getenv('AGENCIA_LEADS_TOKEN') ?: '';
if ($agenciaToken !== '') {
    $payload = [
        'token' => $agenciaToken,
        'origem' => 'evertonbrito.com',
        'nome' => $name,
        'contato' => $whatsapp,
        'whatsapp' => $whatsapp,
        'email' => $email,
        'project' => $project,
        'mensagem' => $message ?: 'Lead do formulário de contato do portfólio',
    ];
    $ch = curl_init('https://app.evertonbrito.com/api/leads');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
    ]);
    curl_exec($ch);
    curl_close($ch);
}

if ($sent) {
    echo json_encode(['success' => true, 'message' => 'Email enviado com sucesso!']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro ao enviar email.']);
}

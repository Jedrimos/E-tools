<?php
/**
 * Einstellungsseite für Elektronikertools im WordPress-Admin.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'admin_menu', 'ettools_admin_menu' );

function ettools_admin_menu() {
	add_options_page(
		__( 'Elektronikertools', 'elektronikertools' ),
		__( 'Elektronikertools', 'elektronikertools' ),
		'manage_options',
		'elektronikertools',
		'ettools_settings_page'
	);
}

function ettools_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Elektronikertools – Einstellungen', 'elektronikertools' ); ?></h1>

		<div class="notice notice-info inline" style="margin-top:0">
			<p>
				ℹ Elektronikertools speichert alle Daten lokal im Browser (<code>localStorage</code>).
				Eine externe Datenbankverbindung ist nicht erforderlich.
			</p>
		</div>

		<h2><?php esc_html_e( 'Verwendung', 'elektronikertools' ); ?></h2>
		<p>Shortcode in Seite/Beitrag einfügen:</p>
		<pre style="background:#f0f0f0;padding:12px;border-radius:6px;display:inline-block">[elektronikertools]</pre>

		<h3><?php esc_html_e( 'Optionale Parameter', 'elektronikertools' ); ?></h3>
		<table class="widefat" style="max-width:600px">
			<thead>
				<tr><th>Parameter</th><th>Beschreibung</th><th>Beispiel</th></tr>
			</thead>
			<tbody>
				<tr>
					<td><code>hoehe</code></td>
					<td>Mindesthöhe des App-Containers</td>
					<td><code>[elektronikertools hoehe="100vh"]</code></td>
				</tr>
				<tr>
					<td><code>klasse</code></td>
					<td>Zusätzliche CSS-Klasse</td>
					<td><code>[elektronikertools klasse="meine-klasse"]</code></td>
				</tr>
			</tbody>
		</table>

		<hr>

		<h2><?php esc_html_e( 'Plugin-Version', 'elektronikertools' ); ?></h2>
		<p>Aktive Version: <strong><?php echo esc_html( ETTOOLS_VERSION ); ?></strong></p>
	</div>
	<?php
}

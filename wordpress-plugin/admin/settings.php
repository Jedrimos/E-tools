<?php
/**
 * Einstellungsseite für Elektronikertools im WordPress-Admin.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'admin_menu',  'ettools_admin_menu' );
add_action( 'admin_init',  'ettools_register_settings' );

function ettools_admin_menu() {
	add_options_page(
		__( 'Elektronikertools', 'elektronikertools' ),
		__( 'Elektronikertools', 'elektronikertools' ),
		'manage_options',
		'elektronikertools',
		'ettools_settings_page'
	);
}

function ettools_register_settings() {
	register_setting( 'ettools_settings_group', 'ettools_supabase_url', [
		'type'              => 'string',
		'sanitize_callback' => 'esc_url_raw',
		'default'           => '',
	] );
	register_setting( 'ettools_settings_group', 'ettools_supabase_key', [
		'type'              => 'string',
		'sanitize_callback' => 'sanitize_text_field',
		'default'           => '',
	] );
}

function ettools_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Elektronikertools – Einstellungen', 'elektronikertools' ); ?></h1>

		<p style="color:#666;max-width:600px">
			Die Elektronikertools speichern Daten standardmäßig im Browser (<code>localStorage</code>).
			Mit einem optionalen Supabase-Konto werden Daten in einer Datenbank gespeichert
			und stehen auf mehreren Geräten / für mehrere Techniker zur Verfügung.
		</p>

		<form method="post" action="options.php">
			<?php
			settings_fields( 'ettools_settings_group' );
			$url = get_option( 'ettools_supabase_url', '' );
			$key = get_option( 'ettools_supabase_key', '' );
			?>

			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">
						<label for="ettools_supabase_url">
							<?php esc_html_e( 'Supabase URL', 'elektronikertools' ); ?>
						</label>
					</th>
					<td>
						<input
							type="url"
							id="ettools_supabase_url"
							name="ettools_supabase_url"
							value="<?php echo esc_attr( $url ); ?>"
							class="regular-text"
							placeholder="https://xxxxx.supabase.co"
						/>
						<p class="description">
							<?php esc_html_e( 'Zu finden unter Supabase → Settings → API → Project URL', 'elektronikertools' ); ?>
						</p>
					</td>
				</tr>
				<tr>
					<th scope="row">
						<label for="ettools_supabase_key">
							<?php esc_html_e( 'Supabase Anon Key', 'elektronikertools' ); ?>
						</label>
					</th>
					<td>
						<input
							type="password"
							id="ettools_supabase_key"
							name="ettools_supabase_key"
							value="<?php echo esc_attr( $key ); ?>"
							class="regular-text"
							placeholder="eyJ…"
						/>
						<p class="description">
							<?php esc_html_e( 'Supabase → Settings → API → anon public key', 'elektronikertools' ); ?>
						</p>
					</td>
				</tr>
			</table>

			<?php submit_button( __( 'Einstellungen speichern', 'elektronikertools' ) ); ?>
		</form>

		<hr>

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

		<h2><?php esc_html_e( 'Supabase SQL-Schema', 'elektronikertools' ); ?></h2>
		<p>
			Falls Supabase verwendet wird, muss das Schema im SQL-Editor von Supabase einmalig ausgeführt werden.
			Die vollständige SQL-Datei befindet sich im Plugin-Verzeichnis unter
			<code>docs/supabase.sql</code> (bei Installation aus dem Quellcode).
		</p>

		<?php if ( $url && $key ) : ?>
			<div class="notice notice-success inline" style="margin-top:0">
				<p>✓ Supabase ist konfiguriert. URL: <code><?php echo esc_html( $url ); ?></code></p>
			</div>
		<?php else : ?>
			<div class="notice notice-info inline" style="margin-top:0">
				<p>ℹ Supabase ist nicht konfiguriert. Die App nutzt ausschließlich <code>localStorage</code>.</p>
			</div>
		<?php endif; ?>
	</div>
	<?php
}

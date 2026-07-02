<?php
/**
 * Plugin Name:  Elektronikertools
 * Plugin URI:   https://github.com/Jedrimos/E-tools
 * Description:  Browserbasierte Werkzeuge für Elektrofachkräfte – Verteilerplaner, Stundenbuch, Prüfprotokoll, Wissensdatenbank, Wartungsprotokoll, Elektrorechner, KNX-Planer, Materialzähler. Einbinden mit dem Shortcode [elektronikertools].
 * Version:      2026.4.0
 * Author:       Elektronikertools
 * License:      MIT
 * Text Domain:  elektronikertools
 * Requires PHP: 7.4
 * Requires at least: 5.9
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ETTOOLS_VERSION',    '2026.4.0' );
define( 'ETTOOLS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'ETTOOLS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once ETTOOLS_PLUGIN_DIR . 'admin/settings.php';

// ── Hooks ─────────────────────────────────────────────────────────────────────
add_shortcode( 'elektronikertools', 'ettools_shortcode' );
add_action( 'wp_enqueue_scripts',  'ettools_enqueue_assets' );
add_filter( 'script_loader_tag',   'ettools_add_module_type', 10, 2 );

// ── Assets einbinden (nur wenn Shortcode auf der Seite ist) ───────────────────
function ettools_enqueue_assets() {
	global $post;

	if ( ! is_singular() || ! is_a( $post, 'WP_Post' ) ) {
		return;
	}
	if ( ! has_shortcode( $post->post_content, 'elektronikertools' ) ) {
		return;
	}

	$js_file  = ETTOOLS_PLUGIN_DIR . 'assets/elektronikertools.js';
	$css_file = ETTOOLS_PLUGIN_DIR . 'assets/elektronikertools.css';

	if ( ! file_exists( $js_file ) ) {
		return; // Assets noch nicht gebaut
	}

	if ( file_exists( $css_file ) ) {
		wp_enqueue_style(
			'elektronikertools',
			ETTOOLS_PLUGIN_URL . 'assets/elektronikertools.css',
			[],
			ETTOOLS_VERSION
		);
	}

	wp_enqueue_script(
		'elektronikertools',
		ETTOOLS_PLUGIN_URL . 'assets/elektronikertools.js',
		[],
		ETTOOLS_VERSION,
		true // in footer
	);

	// Supabase-Credentials und WP-Kontext an die App übergeben
	wp_localize_script(
		'elektronikertools',
		'elektrotools_config',
		[
			'supabase_url' => get_option( 'ettools_supabase_url', '' ),
			'supabase_key' => get_option( 'ettools_supabase_key', '' ),
			'plugin_url'   => ETTOOLS_PLUGIN_URL,
			'wp_mode'      => true,
			'version'      => ETTOOLS_VERSION,
		]
	);
}

// ES-Module-Typ auf das Script-Tag setzen (Vite baut ESM)
function ettools_add_module_type( $tag, $handle ) {
	if ( 'elektronikertools' === $handle ) {
		return str_replace( '<script ', '<script type="module" ', $tag );
	}
	return $tag;
}

// ── Shortcode ─────────────────────────────────────────────────────────────────
function ettools_shortcode( $atts ) {
	$atts = shortcode_atts(
		[
			'hoehe'  => 'auto',
			'klasse' => '',
		],
		$atts,
		'elektronikertools'
	);

	$js_file = ETTOOLS_PLUGIN_DIR . 'assets/elektronikertools.js';

	if ( ! file_exists( $js_file ) ) {
		return '<div style="padding:24px;border:2px dashed #ccc;border-radius:8px;'
			. 'text-align:center;color:#666;font-family:sans-serif;">'
			. '<strong>⚠ Elektronikertools:</strong> Assets wurden noch nicht kompiliert.<br>'
			. 'Bitte <code>npm install &amp;&amp; npm run build:wp</code> '
			. 'im Plugin-Verzeichnis ausführen, oder die fertig gebaute Version installieren.'
			. '</div>';
	}

	$wrap_style = '';
	if ( 'auto' !== $atts['hoehe'] ) {
		$wrap_style = ' style="min-height:' . esc_attr( $atts['hoehe'] ) . '"';
	}

	$extra_class = $atts['klasse'] ? ' ' . sanitize_html_class( $atts['klasse'] ) : '';

	return '<div id="elektronikertools-root" class="elektronikertools-wrap'
		. $extra_class . '"' . $wrap_style . '></div>';
}

// ── Plugin-Aktivierung: Hinweis wenn Assets fehlen ───────────────────────────
function ettools_activation_check() {
	if ( ! file_exists( ETTOOLS_PLUGIN_DIR . 'assets/elektronikertools.js' ) ) {
		set_transient( 'ettools_build_notice', true, 60 );
	}
}
register_activation_hook( __FILE__, 'ettools_activation_check' );

add_action( 'admin_notices', function () {
	if ( get_transient( 'ettools_build_notice' ) ) {
		echo '<div class="notice notice-warning is-dismissible">'
			. '<p><strong>Elektronikertools:</strong> Die App-Assets fehlen noch. '
			. 'Führe im Plugin-Verzeichnis <code>npm install && npm run build:wp</code> aus '
			. 'oder lade die fertig gebaute ZIP-Version herunter.</p></div>';
		delete_transient( 'ettools_build_notice' );
	}
} );

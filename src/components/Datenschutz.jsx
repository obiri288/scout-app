import React from 'react';
import { ArrowLeft } from 'lucide-react';

const Datenschutz = () => {
    const handleBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/waitlist';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col py-12 px-4 font-sans relative">
            <div className="max-w-4xl mx-auto p-8 my-10 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl text-slate-300 space-y-4">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full transition-colors text-slate-300"
                        id="back-button-datenschutz"
                    >
                        <ArrowLeft size={20} />
                        <span className="text-xs pr-2 font-medium">Zurück</span>
                    </button>
                </div>

                <h1 className="text-slate-100 font-bold mt-8 mb-4 text-3xl">Datenschutzerklärung</h1>

                <h2 className="text-slate-100 font-bold mt-8 mb-4 text-xl">1. Datenschutz auf einen Blick</h2>
                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Allgemeine Hinweise</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.
                </p>

                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Datenerfassung auf dieser Website</h3>
                <h4 className="text-slate-100 font-medium text-base mt-3 mb-1">Wer ist verantwortlich für die Datenerfassung auf dieser Website?</h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle“ in dieser Datenschutzerklärung entnehmen.
                </p>

                <h4 className="text-slate-100 font-medium text-base mt-3 mb-1">Wie erfassen wir Ihre Daten?</h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in unser Registrierungs- oder Waitlist-Formular eingeben.
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald Sie diese Website betreten.
                </p>

                <h4 className="text-slate-100 font-medium text-base mt-3 mb-1">Wofür nutzen wir Ihre Daten?</h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden. Für den Pre-Launch-Service nutzen wir Ihre E-Mail-Adresse, um Sie über Produktupdates, den Launch und Ihren Waitlist-Status zu informieren.
                </p>

                <h4 className="text-slate-100 font-medium text-base mt-3 mb-1">Welche Rechte haben Sie bezüglich Ihrer Daten?</h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter bestimmten Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit an uns wenden.
                </p>

                <h2 className="text-slate-100 font-bold mt-8 mb-4 text-xl">2. Allgemeine Hinweise und Pflichtinformationen</h2>
                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Datenschutz</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben. Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können. Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben und wofür wir sie nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Wir weisen darauf hin, dass die Datenübertragung im Internet (z. B. bei der Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht möglich.
                </p>

                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Hinweis zur verantwortlichen Stelle</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
                </p>
                <p className="text-slate-300 text-sm leading-relaxed font-semibold mt-2">
                    trendtriebwerk, Georg-Blume-Straße 19, 22119 Hamburg, Deutschland. E-Mail: kontakt@cavio.me
                </p>
                <p className="text-slate-300 text-sm leading-relaxed mt-2">
                    Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten (z. B. Namen, E-Mail-Adressen o. Ä.) entscheidet.
                </p>

                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Speicherdauer</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschbegehren geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer personenbezogenen Daten haben (z. B. steuer- oder handelsrechtliche Aufbewahrungsfristen); im letztgenannten Fall erfolgt die Löschung nach Fortfall dieser Gründe.
                </p>

                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Allgemeine Hinweise zu den Rechtsgrundlagen der Datenverarbeitung auf dieser Website</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Sofern Sie in die Datenverarbeitung eingewilligt haben, verarbeiten wir Ihre personenbezogenen Daten auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO bzw. Art. 9 Abs. 2 lit. a DSGVO, sofern besondere Datenkategorien nach Art. 9 Abs. 1 DSGVO verarbeitet werden. Im Falle einer ausdrücklichen Einwilligung in die Übertragung personenbezogener Daten in Drittstaaten erfolgt die Datenverarbeitung zudem auf Grundlage von Art. 49 Abs. 1 lit. a DSGVO. Die Registrierung auf der Waitlist und Verarbeitung Ihrer E-Mail-Adresse erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO zur Durchführung vorvertraglicher Maßnahmen. Sofern wir Daten zur Erfüllung einer rechtlichen Verpflichtung verarbeiten, erfolgt dies auf Grundlage von Art. 6 Abs. 1 lit. c DSGVO. Die Datenverarbeitung kann ferner auf Grundlage unseres berechtigten Interesses nach Art. 6 Abs. 1 lit. f DSGVO erfolgen. Über die jeweils im Einzelfall einschlägigen Rechtsgrundlagen wird in den folgenden Absätzen dieser Datenschutzerklärung informiert.
                </p>

                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Widerruf Ihrer Einwilligung zur Datenverarbeitung</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
                </p>

                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Recht auf Beschwerde bei der zuständigen Aufsichtsbehörde</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat ihres gewöhnlichen Aufenthalts, ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes zu. Das Beschwerderecht besteht unbeschadet anderweitiger verwaltungsrechtlicher oder gerichtlicher Rechtsbehelfe.
                </p>

                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Recht auf Datenübertragbarkeit</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in einem gängigen, maschinenlesbaren Format aushändigen zu lassen. Sofern Sie die direkte Übertragung der Daten an einen anderen Verantwortlichen verlangen, erfolgt dies nur, soweit es technisch machbar is.
                </p>

                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Auskunft, Löschung und Berichtigung</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich jederzeit an uns wenden.
                </p>

                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Recht auf Einschränkung der Verarbeitung</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Hierzu können Sie sich jederzeit an uns wenden. Das Recht auf Einschränkung der Verarbeitung besteht in folgenden Fällen:
                </p>
                <ul className="text-slate-300 text-sm list-disc pl-6 space-y-2 my-2">
                    <li>Wenn Sie die Richtigkeit Ihrer bei uns gespeicherten personenbezogenen Daten bestreiten, benötigen wir in der Regel Zeit, um dies zu überprüfen. Für die Dauer der Prüfung haben Sie das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.</li>
                    <li>Wenn die Verarbeitung Ihrer personenbezogenen Daten unrechtmäßig geschah/geschieht, können Sie statt der Löschung die Einschränkung der Datenverarbeitung verlangen.</li>
                    <li>Wenn wir Ihre personenbezogenen Daten nicht mehr benötigen, Sie sie jedoch zur Ausübung, Verteidigung oder Geltendmachung von Rechtsansprüchen benötigen, haben Sie das Recht, statt der Löschung die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.</li>
                    <li>Wenn Sie einen Widerspruch nach Art. 21 Abs. 1 DSGVO eingelegt haben, muss eine Abwägung zwischen Ihren und unseren Interessen vorgenommen werden. Solange noch nicht feststeht, wessen Interessen überwiegen, haben Sie das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.</li>
                </ul>

                <h2 className="text-slate-100 font-bold mt-8 mb-4 text-xl">3. Datenerfassung auf dieser Website</h2>
                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Cookies</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Unsere Internetseiten verwenden so genannte „Cookies“. Cookies sind kleine Datenpakete und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert. Session-Cookies werden nach Ende Ihres Besuchs automatisch gelöscht. Permanente Cookies bleiben auf Ihrem Endgerät gespeichert, bis Sie diese selbst löschen oder eine automatische Löschung durch Ihren Webbrowser erfolgt.
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Cookies können von uns (First-Party-Cookies) oder von Drittunternehmen stammen (sog. Third-Party-Cookies). Third-Party-Cookies ermöglichen die Einbindung bestimmter Dienstleistungen von Drittunternehmen innerhalb von Webseiten (z. B. Cookies zur Abwicklung von Zahlungsdienstleistungen).
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Cookies haben verschiedene Funktionen. Zahlreiche Cookies sind technisch notwendig, da bestimmte Webseitenfunktionen ohne diese nicht funktionieren würden (z. B. die Warenkorbfunktion oder die Anzeige von Videos). Andere Cookies dienen dazu, das Nutzerverhalten auszuwerten oder Werbung anzuzeigen.
                </p>

                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Server-Log-Dateien</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:
                </p>
                <ul className="text-slate-300 text-sm list-disc pl-6 space-y-2 my-2">
                    <li>Browsertyp und Browserversion</li>
                    <li>verwendetes Betriebssystem</li>
                    <li>Referrer URL</li>
                    <li>Hostname des zugreifenden Rechners</li>
                    <li>Uhrzeit der Serveranfrage</li>
                    <li>IP-Adresse</li>
                </ul>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
                </p>

                <h3 className="text-slate-100 font-semibold text-lg mt-4 mb-2">Registrierung auf dieser Website (Waitlist / Pre-Launch)</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Sie können sich auf unserer Website eintragen, um auf die Waitlist für unseren Pre-Launch gesetzt zu werden. Die eingegebenen Daten (E-Mail-Adresse und ggf. Name) verwenden wir nur zum Zwecke der Nutzung des jeweiligen Angebotes oder Dienstes, für den Sie sich registriert haben. Die Pflichtangaben bei der Registrierung müssen vollständig angegeben werden. Andernfalls müssen wir die Registrierung ablehnen.
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Für wichtige Änderungen etwa beim Angebotsumfang oder bei technisch notwendigen Änderungen nutzen wir die bei der Registrierung angegebene E-Mail-Adresse, um Sie auf diesem Wege zu informieren.
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Die Verarbeitung der bei der Registrierung eingegebenen Daten erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) und zur Durchführung vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO). Sie können eine von Ihnen erteilte Einwilligung jederzeit widerrufen. Dazu reicht eine formlose Mitteilung per E-Mail an uns. Die Rechtmäßigkeit der bereits erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Die bei der Registrierung erfassten Daten werden von uns gespeichert, solange Sie auf unserer Waitlist registriert sind und werden anschließend gelöscht. Gesetzliche Aufbewahrungsfristen bleiben unberührt.
                </p>
            </div>
        </div>
    );
};

export default Datenschutz;

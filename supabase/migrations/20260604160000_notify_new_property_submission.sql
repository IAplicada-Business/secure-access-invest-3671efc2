-- Notificação automática quando um corretor submete um novo ativo.
-- Trigger AFTER INSERT em property_submissions insere em notifications.
-- A função é SECURITY DEFINER: roda como owner e ignora a RLS de
-- notifications (que, após o endurecimento, não permite INSERT anônimo).
-- Idempotente.

CREATE OR REPLACE FUNCTION public.notify_new_property_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_wa text;
BEGIN
  SELECT title INTO v_title FROM public.properties WHERE id = NEW.property_id;
  SELECT value INTO v_wa FROM public.settings WHERE key = 'whatsapp_number';

  INSERT INTO public.notifications (type, title, message, metadata)
  VALUES (
    'new_property_submission',
    'Novo ativo submetido por ' || COALESCE(NEW.broker_name, 'corretor'),
    COALESCE(v_title, 'Novo imóvel')
      || CASE WHEN NEW.owner_name IS NOT NULL THEN ' — proprietário: ' || NEW.owner_name ELSE '' END,
    jsonb_build_object(
      'submission_id', NEW.id,
      'property_id', NEW.property_id,
      'link', '/admin/submissoes',
      'broker_name', NEW.broker_name,
      'broker_phone', NEW.broker_phone,
      'wa_number', v_wa,
      'summary', 'Novo ativo submetido por ' || COALESCE(NEW.broker_name, 'corretor')
                 || ': ' || COALESCE(v_title, 'imóvel')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_property_submission ON public.property_submissions;
CREATE TRIGGER trg_notify_new_property_submission
  AFTER INSERT ON public.property_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_property_submission();
